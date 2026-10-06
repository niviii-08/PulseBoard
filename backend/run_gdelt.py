import asyncio
from app.tasks.ingestion_tasks import _collect_global_news, _collect_and_process

async def main():
    print("Starting data ingestion tasks...")
    try:
        print("1. Collecting Global News (GDELT / NewsAPI)...")
        res1 = await _collect_global_news()
        print(f"Global News Result: {res1}")
    except Exception as e:
        print(f"Error in global news: {e}")
        
    try:
        print("2. Collecting Brand-specific data (Reddit/News RSS)...")
        res2 = await _collect_and_process()
        print(f"Brand Collection Result: {res2}")
    except Exception as e:
        print(f"Error in brand collection: {e}")
        
    print("Finished data ingestion.")

if __name__ == "__main__":
    asyncio.run(main())
