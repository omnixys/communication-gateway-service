"""Quick health check for the Communication Gateway."""
import sys
from urllib.request import urlopen

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8002"


def main() -> None:
    resp = urlopen(f"{BASE_URL}/health")
    print(f"Gateway health: {resp.status} {resp.read().decode()}")
    if resp.status != 200:
        sys.exit(1)


if __name__ == "__main__":
    main()
