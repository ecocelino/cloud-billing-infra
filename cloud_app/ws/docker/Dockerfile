# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set the working directory to /app
WORKDIR /app

# Add a build argument for the database host
ARG DB_HOST

# Copy the requirements file into the container
COPY requirements.txt ./

# Install any dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application source code to the container
COPY ws.py ./

# Expose port 5000 for the Flask application
EXPOSE 5000

# Run the Flask app
# The command uses '0.0.0.0' to make the server accessible from outside the container.
CMD ["python", "ws.py"]
