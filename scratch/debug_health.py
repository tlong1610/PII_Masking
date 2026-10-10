import asyncio

from httpx import AsyncClient

from src.config import get_settings
from src.main import app


async def main():
    import os
    os.environ["ENABLE_MONGO"] = "true"
    os.environ["MONGO_URI"] = "mongodb://dummy"
    get_settings.cache_clear()

    import pymongo
    class MockAdmin:
        def command(self, cmd):
            pass
    class MockMongoClient:
        def __init__(self, *args, **kwargs):
            self.admin = MockAdmin()
    pymongo.MongoClient = MockMongoClient

    async with AsyncClient(transport=__import__('httpx').ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/readyz")
        print(res.status_code, res.json())
asyncio.run(main())
