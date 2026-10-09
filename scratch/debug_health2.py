import traceback
try:
    class MockAdmin:
        def command(self, cmd):
            pass
    class MockMongoClient:
        def __init__(self, *args, **kwargs):
            self.admin = MockAdmin()
    client = MockMongoClient()
    client.admin.command('ping')
except Exception as e:
    traceback.print_exc()
