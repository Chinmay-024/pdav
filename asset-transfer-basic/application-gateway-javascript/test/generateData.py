import json
import random
import os

# Function to generate random data for 24 hours in a day
def generate_random_data():
    return [random.randint(1, 24) for _ in range(24)]

# Function to generate data for 30 days for each user
def generate_user_data(user_id):
    return [{"day": day, "hours": generate_random_data()} for day in range(1, 31)]

# Function to generate the JSON structure for two users
def generate_json():
    users = [
        {"user_id": 1, "data": generate_user_data(1)},
        {"user_id": 2, "data": generate_user_data(2)},
        {"user_id": 3, "data": generate_user_data(2)},
        {"user_id": 4, "data": generate_user_data(2)},
        {"user_id": 5, "data": generate_user_data(2)},
        {"user_id": 6, "data": generate_user_data(2)},
        {"user_id": 7, "data": generate_user_data(2)},
        {"user_id": 8, "data": generate_user_data(2)},
        {"user_id": 9, "data": generate_user_data(2)},
        {"user_id": 10, "data": generate_user_data(2)}
    ]
    return {"users": users}

# Generate the JSON structure
json_data = generate_json()
current_directory = os.path.dirname(os.path.abspath(__file__))
json_file_path = os.path.join(current_directory, "user_data.json")
# Save the JSON data to a file
with open(json_file_path, 'w') as json_file:
    json.dump(json_data, json_file, indent=2)

print("JSON data generated and saved to 'user_data.json'")
