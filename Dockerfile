# Use the official Ruby 2.7.8 image as the base
FROM ruby:2.7.8

# Install dependencies
RUN gem install bundler

# Copy the custom startup script to the container
COPY _startup.sh /opt/startup.sh

# Make the script executable
RUN chmod +x /opt/startup.sh

# Expose port 8080
EXPOSE 8080

# Set the command to execute the startup script when the container starts
CMD ["/opt/startup.sh"]
