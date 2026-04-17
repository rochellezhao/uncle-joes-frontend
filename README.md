# uncle-joes-frontend
Customer-facing frontend for the Uncle Joe’s Coffee web application
# Uncle Joe's Coffee — Frontend

This repository contains the frontend for the Uncle Joe’s Coffee pilot web application. The frontend is the customer-facing layer of the project and is designed to give users a simple, modern website experience where they can browse the menu, log in to their Coffee Club account, review past orders, and check their loyalty points balance.

The frontend works together with the `uncle-joes-api` backend repository, which connects to the Google BigQuery database and provides the application data through FastAPI endpoints.

## What's in this repo

| File | Description |
|------|-------------|
| `index.html` | Main frontend page and entry point for the application |
| `app.js` *(or similar)* | Frontend logic for rendering data and connecting to the API |
| `styles.css` | Styling for the website layout and design |
| `README.md` | Project overview and setup instructions |
| `Dockerfile` | Container build instructions for deployment to Cloud Run |

## Project Features

The frontend is expected to support the following core user features:

- Browse the Uncle Joe’s Coffee menu
- View store information
- Log in to a Coffee Club account
- View past order history
- Check Coffee Club loyalty points balance

## Purpose of the Frontend

The goal of this frontend is to present existing business data in a clean and user-friendly interface. This is a read-first pilot application, meaning the focus is on retrieving and displaying information rather than handling full online ordering or payment processing.

The website is intended to help Uncle Joe’s evaluate whether a more modern digital customer experience would work well before rolling out a new platform across all store locations.

## Technology Stack

- **Frontend Framework:** Vue.js or React.js (via CDN)
- **Backend Connection:** FastAPI REST API
- **Styling:** HTML/CSS/JavaScript
- **Containerization:** Docker
- **Deployment:** Google Cloud Run
- **Version Control:** GitHub
- **Development Environment:** Google Cloud Shell

## Overview

1. Clone the Repository  
2. Open the Frontend Files  
3. Connect the Frontend to the Backend API  
4. Run and Test the Application  
5. Deploy the Frontend to Cloud Run  
6. Continue Expanding Pages for Final Deliverables  

---

## Part 1: Clone the Repository

### Step 1: Clone the Repository

In Google Cloud Shell or your local terminal, run:

```bash
git clone YOUR_REPOSITORY_URL
cd uncle-joes-frontend
