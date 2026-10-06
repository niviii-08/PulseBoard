from app.workers.tasks import route_to_collectors
print("Dispatching collectors task...")
result = route_to_collectors.apply_async(args=["demo"])
print("Task queued with ID:", result.id)
