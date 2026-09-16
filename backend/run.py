"""Inicializa a edição local: python -m backend.run."""
import argparse


def main():
    from backend.app import create_app
    from backend.config import DEBUG, HOST, PORT

    parser = argparse.ArgumentParser(description="Dataops marketing — edição local")
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()
    app = create_app()
    print(f"Versão local disponível em http://{HOST}:{args.port}")
    app.run(host=HOST, port=args.port, debug=DEBUG, threaded=True)


if __name__ == "__main__":
    main()
