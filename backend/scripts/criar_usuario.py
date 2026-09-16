"""Gerencia usuários: python -m backend.scripts.criar_usuario --help."""
import argparse
import getpass
import os

import mysql.connector
from backend.utils.crypto import hash_senha


def main():
    parser = argparse.ArgumentParser(description="Listar ou criar usuários")
    parser.add_argument("--listar", action="store_true")
    parser.add_argument("--nome")
    parser.add_argument("--email")
    parser.add_argument("--role", choices=("admin", "user", "readonly"), default="user")
    args = parser.parse_args()
    if not args.listar and not (args.nome and args.email):
        parser.error("informe --listar ou --nome e --email")
    senha = None
    if not args.listar:
        senha = getpass.getpass("Senha: ")
        if not senha or senha != getpass.getpass("Confirme a senha: "):
            parser.error("a senha deve ser preenchida e a confirmação deve coincidir")
    conn = mysql.connector.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ.get("DB_NAME", "bd_contatus"),
        charset="utf8mb4",
    )
    try:
        cur = conn.cursor(dictionary=True)
        try:
            if args.listar:
                cur.execute("SELECT id, nome, email, role, ativo FROM usuarios_app ORDER BY id")
                for usuario in cur.fetchall():
                    print(usuario)
                return
            cur.execute("SELECT id FROM usuarios_app WHERE email = %s", (args.email,))
            if cur.fetchone():
                print("Já existe um usuário com esse e-mail.")
                return
            cur.execute(
                "INSERT INTO usuarios_app (nome, email, senha_hash, role) VALUES (%s, %s, %s, %s)",
                (args.nome, args.email, hash_senha(senha), args.role),
            )
            conn.commit()
            print("Usuário criado.")
        finally:
            cur.close()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
