"""Aplicativo Windows: instalação, conexão e inicialização sem terminal."""
import ctypes
import json
import logging
import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import traceback
import webbrowser

if not getattr(sys, "frozen", False):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    # Evita janela borrada/no tamanho errado em telas com escala diferente
    # (a máquina que gera o pacote raramente tem a mesma escala do usuário final).
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    pass


def _fatal_startup_error():
    """Sem console (windowed), um erro antes da janela abrir some sem aviso.
    Grava um log e mostra uma caixa nativa do Windows, sem depender do tkinter."""
    try:
        directory = data_dir()
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "launcher.log").open("a", encoding="utf-8").write(
            "\n--- falha ao iniciar ---\n" + traceback.format_exc()
        )
    except Exception:
        pass
    ctypes.windll.user32.MessageBoxW(
        0,
        "O Dataops Marketing não conseguiu abrir neste computador.\n\n"
        "Feche o antivírus temporariamente e tente novamente, ou avise a "
        "equipe técnica com o arquivo launcher.log salvo em "
        "%LOCALAPPDATA%\\DataopsMarketing.",
        "Dataops Marketing",
        0x10,
    )

from desktop.settings import apply_settings, data_dir, load_settings, save_settings, test_connection
from desktop.server import LocalServer, resource_root


def install_location():
    return Path(os.environ["LOCALAPPDATA"]) / "Programs" / "DataopsMarketing" / "DataopsMarketing.exe"


def install_application():
    target = install_location()
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".new")
    shutil.copy2(sys.executable, temporary)
    temporary.replace(target)
    env = os.environ.copy()
    env["DATAOPS_EXE"] = str(target)
    # Caminho transmitido por variável, sem interpolá-lo como código PowerShell.
    script = """$ErrorActionPreference='Stop'
$shell=New-Object -ComObject WScript.Shell
foreach ($folder in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $link=$shell.CreateShortcut((Join-Path $folder 'Dataops Marketing.lnk'))
  $link.TargetPath=$env:DATAOPS_EXE
  $link.WorkingDirectory=Split-Path $env:DATAOPS_EXE
  $link.IconLocation=$env:DATAOPS_EXE+',0'
  $link.Description='Dataops Marketing - edição local'
  $link.Save()
}
"""
    powershell = Path(os.environ["WINDIR"]) / "System32/WindowsPowerShell/v1.0/powershell.exe"
    subprocess.run([str(powershell), "-NoProfile", "-NonInteractive", "-Command", script],
                   check=True, env=env, creationflags=subprocess.CREATE_NO_WINDOW,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return target


def launch_installed(path, *args):
    subprocess.Popen([str(path), *args], cwd=str(path.parent), creationflags=subprocess.CREATE_NO_WINDOW)


class Window:
    def __init__(self, root, installing=False):
        self.root = root
        self.server = LocalServer()
        self.events = queue.Queue()
        self.busy = False
        self.lock_file = None
        self.installing = installing
        root.title("Dataops Marketing · versão local")
        root.geometry("560x300" if installing else "560x460")
        root.resizable(False, False)
        root.configure(bg="#f5f3fa")
        icon = resource_root() / "desktop" / "app.ico"
        if icon.exists():
            root.iconbitmap(str(icon))
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#f5f3fa")
        style.configure("TLabel", background="#f5f3fa", font=("Segoe UI", 10))
        style.configure("TButton", font=("Segoe UI", 10), padding=9)
        style.configure("Title.TLabel", font=("Segoe UI", 19, "bold"), foreground="#452579")
        frame = ttk.Frame(root, padding=28)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="dataops marketing", style="Title.TLabel").pack(anchor="w")
        ttk.Label(frame, text="versão local · uso provisório", foreground="#77668e").pack(anchor="w", pady=(0, 20))
        self.status = tk.StringVar(value="Pronto para configurar a conexão.")
        self.fields = {}
        self.entries = []
        if installing:
            ttk.Label(frame, text="Instale o aplicativo e crie um atalho na área de trabalho.\nAs dependências já estão incluídas neste pacote.").pack(anchor="w", pady=8)
            self.action = ttk.Button(frame, text="Instalar e abrir", command=self.install)
            self.action.pack(fill="x", pady=14)
            self.status.set("Não é necessário instalar Python ou Node.")
        else:
            ttk.Label(frame, text="Informe o usuário e a senha do banco fornecidos pela sua equipe.").pack(anchor="w", pady=(0, 10))
            form = ttk.Frame(frame)
            form.pack(fill="x")
            defaults = {"user": "", "password": ""}
            saved = None
            try:
                saved = load_settings()
                if saved:
                    defaults.update(saved)
            except Exception:
                self.status.set("Não foi possível ler a conexão salva. Informe os dados novamente.")
            labels = [("user", "Usuário do banco"), ("password", "Senha do banco")]
            for row, (key, label) in enumerate(labels):
                ttk.Label(form, text=label).grid(row=row, column=0, sticky="w", pady=6)
                var = tk.StringVar(value=str(defaults[key]))
                entry = ttk.Entry(form, textvariable=var, width=29, show="•" if "password" in key else "")
                entry.grid(row=row, column=1, sticky="ew", padx=(12, 0), pady=6)
                self.fields[key] = var
                self.entries.append(entry)
            form.columnconfigure(1, weight=1)
            ttk.Label(frame, text="A conexão é salva com proteção do Windows neste usuário.\nNenhum usuário da aplicação é necessário.", foreground="#77668e").pack(anchor="w", pady=12)
            self.action = ttk.Button(frame, text="Conectar e abrir", command=self.connect)
            self.action.pack(fill="x", pady=(8, 4))
            self.configure_button = ttk.Button(frame, text="Alterar conexão", command=self.reconfigure, state="disabled")
            self.configure_button.pack(fill="x", pady=4)
            if saved and "--configure" not in sys.argv:
                root.after(400, self.connect)
        ttk.Label(frame, textvariable=self.status, wraplength=500).pack(anchor="w", pady=10)
        self.progress = ttk.Progressbar(frame, mode="indeterminate")
        self.progress.pack(fill="x")
        root.protocol("WM_DELETE_WINDOW", self.close)
        root.after(100, self.poll)

    def work(self, function, success, message):
        if self.busy:
            return
        self.busy = True
        self.action.configure(state="disabled")
        for entry in self.entries:
            entry.configure(state="disabled")
        self.progress.start(12)
        self.status.set(message)
        def worker():
            try:
                self.events.put((success, function(), None))
            except Exception as error:
                self.events.put((success, None, error))
        threading.Thread(target=worker, daemon=True).start()

    def poll(self):
        try:
            callback, result, error = self.events.get_nowait()
        except queue.Empty:
            pass
        else:
            self.busy = False
            self.progress.stop()
            self.action.configure(state="normal")
            if error:
                for entry in self.entries:
                    entry.configure(state="normal")
                self.status.set("Não foi possível concluir. Confira os dados e tente novamente.")
                # Não exibe parâmetros de conexão ou senhas em mensagens de erro.
                if self.installing:
                    message = "Feche uma versão já aberta e tente novamente. Confira se sua conta pode instalar programas na pasta local."
                else:
                    message = "Confira usuário e senha do banco. Verifique também a rede, VPN e a liberação de acesso ao banco."
                    if isinstance(error, ValueError):
                        message = str(error)
                messagebox.showerror("Não foi possível continuar", message, parent=self.root)
            else:
                callback(result)
        if self.root.winfo_exists():
            self.root.after(100, self.poll)

    def install(self):
        def installed(path):
            launch_installed(path)
            self.root.destroy()
        self.work(install_application, installed, "Instalando o aplicativo e criando os atalhos…")

    def connect(self):
        settings = {key: var.get() for key, var in self.fields.items()}
        def start():
            checked = test_connection(settings)
            apply_settings(checked)
            url = self.server.start()
            save_settings(checked)
            return url
        def opened(url):
            self.status.set("Conectado. Mantenha esta janela aberta enquanto usa a aplicação.")
            self.action.configure(text="Abrir aplicação", command=lambda: webbrowser.open(url))
            self.configure_button.configure(state="normal")
            webbrowser.open(url)
        self.work(start, opened, "Verificando a conexão e iniciando a aplicação…")

    def reconfigure(self):
        self.server.stop()
        if self.lock_file:
            self.lock_file.close()
            self.lock_file = None
        args = [sys.executable]
        if not getattr(sys, "frozen", False):
            args.append(str(Path(__file__).resolve()))
        subprocess.Popen([*args, "--configure"], creationflags=subprocess.CREATE_NO_WINDOW)
        self.root.destroy()

    def close(self):
        if self.busy:
            messagebox.showinfo("Aguarde", "Aguarde a operação em andamento terminar.", parent=self.root)
            return
        if self.server.server and not messagebox.askyesno("Encerrar aplicação", "Encerrar o servidor local? Aguarde downloads em andamento antes de continuar.", parent=self.root):
            return
        self.server.stop()
        if self.lock_file:
            self.lock_file.close()
        self.root.destroy()


def self_test(report):
    """Valida o executável completo sem instalar nem acessar banco real."""
    import tempfile
    import urllib.request
    from desktop.settings import protect
    from unittest.mock import patch
    import io
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temporary:
        os.environ["DATAOPS_DATA_DIR"] = temporary
        apply_settings({"host": "127.0.0.1", "database": "test", "user": "test", "password": "synthetic"})
        assert protect(protect(b"synthetic-secret"), decrypt=True) == b"synthetic-secret"
        root = tk.Tk()
        root.withdraw()
        root.update()
        root.destroy()
        import pandas as pd
        frame = pd.DataFrame([{"NOME": "TESTE", "CPF": "00000000000"}])
        buf = io.BytesIO()
        frame.to_parquet(buf)
        assert len(pd.read_parquet(io.BytesIO(buf.getvalue()))) == 1
        from backend.utils.xlsx_exporter import gerar_xlsx
        assert gerar_xlsx(frame, {}).read(2) == b"PK"
        server = LocalServer()
        with patch("mysql.connector.connect", side_effect=AssertionError("Banco real bloqueado no autoteste")):
            try:
                url = server.start()
                with urllib.request.urlopen(url) as response:
                    html = response.read().decode()
                    assert '<div id="root">' in html
                    assert "script-src 'self'" in response.headers["Content-Security-Policy"]
                with urllib.request.urlopen(url + "/api/v1/health") as response:
                    assert json.load(response)["status"] == "healthy"
                with urllib.request.urlopen(url + "/api/v1/localidades/ufs") as response:
                    assert response.status == 200
            finally:
                server.stop()
    Path(report).write_text(json.dumps({"ok": True, "checks": ["dpapi", "tkinter", "parquet", "xlsx", "frontend", "api", "localidades"]}), encoding="utf-8")


def main():
    if "--self-test" in sys.argv:
        report = sys.argv[sys.argv.index("--self-test") + 1]
        try:
            self_test(report)
        except Exception:
            import traceback
            Path(report).write_text(traceback.format_exc(), encoding="utf-8")
            raise
        return
    installing = getattr(sys, "frozen", False) and Path(sys.executable).resolve() != install_location().resolve()
    if not installing:
        directory = data_dir()
        directory.mkdir(parents=True, exist_ok=True)
        # pythonw e executáveis sem console precisam de destinos para logging.
        sys.stderr = open(directory / "launcher.log", "a", encoding="utf-8", buffering=1)
        sys.stdout = sys.stderr
    root = tk.Tk()
    root.report_callback_exception = lambda *exc_info: (
        logging.getLogger("desktop").error("erro na interface", exc_info=exc_info),
        messagebox.showerror(
            "Dataops Marketing",
            "Ocorreu um problema inesperado. A janela continua aberta; "
            "tente novamente ou reabra o programa.",
            parent=root,
        ),
    )
    window = Window(root, installing=installing)
    if not installing:
        import msvcrt
        lock = open(data_dir() / "app.lock", "a+b")
        try:
            lock.seek(0)
            if not lock.read(1):
                lock.write(b"0")
                lock.flush()
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            lock.close()
            messagebox.showinfo("Dataops Marketing", "A aplicação já está aberta. Use a janela existente.", parent=root)
            root.destroy()
            return
        window.lock_file = lock
    root.mainloop()


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        _fatal_startup_error()
        raise
