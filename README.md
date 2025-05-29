# Phone Comparison Website - dealsonline.ninja

Welcome to the Phone Comparison Website! This project is designed to help users compare phones, track price alerts, and find the best deals online. The website is accessible at [dealsonline.ninja](https://dealsonline.ninja).

## Features

- **Phone Comparison**: Compare specifications and prices of various phone models.
- **Price Alerts**: Set alerts for price drops on your favorite phones.
- **User Authentication**: Secure login and registration system.
- **Favorites**: Save your favorite phones for quick access.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## Project Structure

The project is organized as follows:

- **app/**: Contains the core application logic, including authentication, database configuration, and models.
- **app/api/**: Handles API routes for the application.
- **app/routes/**: Defines the web routes for different features like favorites, home, price alerts, and user management.
- **app/security/**: Includes scripts for key rotation and other security-related tasks.
- **app/static/**: Contains static assets like CSS and JavaScript files.
- **app/templates/**: HTML templates for rendering the website's pages.
- **app/tasks/**: Background tasks like price monitoring.
- **app/utils/**: Utility scripts for caching, email handling, and search functionality.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Reginald-kyalo/api_phones_scraper.git
   ```

2. Navigate to the project directory:
   ```bash
   cd api_phones_scraper
   ```

3. Set up a virtual environment:
   ```bash
   python3 -m venv apienv
   source apienv/bin/activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the development server:
   ```bash
   python3 -m app.main
   ```

2. Open your browser and navigate to [http://127.0.0.1:8000].

## Deployment

For production deployment, follow these steps:

1. Set up a production-ready web server (e.g., Nginx, Apache).
2. Use a process manager like Gunicorn or Uvicorn with ASGI for running the app.
3. Configure SSL certificates for secure HTTPS connections.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

For any inquiries or support, please contact us at support@dealsonline.ninja.