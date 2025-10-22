#!/bin/bash
# Load environment variables from .env file
# Use export to properly handle values with spaces
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z $key ]] && continue
  # Export the variable
  export "$key=$value"
done < /opt/jw-attendant-scheduler/.env

# Start the Next.js application
npm start
