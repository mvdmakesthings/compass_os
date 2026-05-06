"""Block until the database accepts a connection. Used by the entrypoint to avoid a
race between docker compose `depends_on: service_healthy` and Docker DNS for the
`db` hostname being usable from the backend container."""

import asyncio
import os
import sys

import asyncpg


async def _try_connect() -> None:
    conn = await asyncpg.connect(
        host=os.getenv("DB_HOST", "db"),
        user=os.getenv("POSTGRES_USER", "compass"),
        password=os.getenv("POSTGRES_PASSWORD", "compass"),
        database=os.getenv("POSTGRES_DB", "compass"),
    )
    await conn.close()


async def main() -> None:
    attempts = int(os.getenv("DB_WAIT_ATTEMPTS", "30"))
    delay = float(os.getenv("DB_WAIT_DELAY", "2"))
    for i in range(1, attempts + 1):
        try:
            await _try_connect()
            print("Database is reachable.")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"DB not ready ({exc!r}), attempt {i}/{attempts}...", file=sys.stderr)
            await asyncio.sleep(delay)
    sys.exit("Database never became reachable.")


if __name__ == "__main__":
    asyncio.run(main())
