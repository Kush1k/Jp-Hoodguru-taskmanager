# Orbit — JP Hoodguru Task Manager

A collaborative, authenticated task manager built by JP Hoodguru.

## Product

- Local app: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)
- Source branch: [feature/frontend-api-integration](https://github.com/Kush1k/Jp-Hoodguru-taskmanager/tree/feature/frontend-api-integration)

> The local link works only while Flask is running on your computer. The included `render.yaml` prepares the app for a public Render deployment with a persistent SQLite disk.

![Orbit sign-in screen](screenshots/sign-in-clean.png)

## Features

- Sign up, log in, and log out with securely hashed passwords.
- Separate task lists per user.
- Create, edit, update status, search, and delete tasks.
- SQLite persistence and Flask JSON API.
- Responsive task-manager interface served directly by Flask.

## Run locally

```powershell
.\.venv\Scripts\Activate.ps1
python app.py
```

Then open [http://127.0.0.1:5000/](http://127.0.0.1:5000/).

## Deploy publicly

1. Create a Render web service from this repository and select the `feature/frontend-api-integration` branch.
2. Render reads `render.yaml`, installs dependencies from `requirements.txt`, and generates `TASK_MANAGER_SECRET`.
3. Use the service URL Render provides as the public product link.

## Team

JP Hoodguru

- Kushik
- Akhil
- Amartya
