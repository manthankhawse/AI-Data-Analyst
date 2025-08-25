from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from ydata_profiling import ProfileReport
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (POST, GET, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Folder to store generated reports
REPORTS_DIR = "reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

# Mount the folder to serve static files
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")

@app.post("/generate-eda")
async def generate_eda(
    file: UploadFile = File(...),
    html_filename: str = Form(...)
):
    """
    Accepts a CSV file and desired HTML filename, generates a profiling report,
    saves it in /reports, and returns the URL to access it via iframe.
    """
    try:
        filename = file.filename.lower()
        
        # Read uploaded file into DataFrame based on file extension
        if filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        elif filename.endswith(".json"):
            df = pd.read_json(file.file)
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(file.file)
        else:
            return JSONResponse(
                {"error": "Unsupported file type. Please upload CSV, JSON, or Excel."},
                status_code=400
            )
        # Ensure filename ends with .html
        if not html_filename.endswith(".html"):
            html_filename += ".html"
        
        file_path = os.path.join(REPORTS_DIR, html_filename)
        
        # Generate the profile report
        profile = ProfileReport(
            df,
            title="EDA Report",
            explorative=True,
            html={"style": {"theme": "united"}}
        )
        # Get HTML as string
        html_content = profile.to_html()
        
        # Inject CSS to hide navbar
        custom_css = """
        <style>
        /* Hide navbar */
        .navbar { display: none !important; }

        /* Dark theme overrides */
        body, html { background-color: #121212 !important; color: #e0e0e0 !important; }
        .container-fluid, .container { background-color: #121212 !important; }
        .card, .panel, .panel-default { background-color: #1e1e1e !important; border: 1px solid #333 !important; color: #e0e0e0 !important; }
        .table { background-color: #1e1e1e !important; color: #e0e0e0 !important; }
        .table th, .table td { border-color: #333 !important; }
        .progress-bar { background-color: #00d4aa !important; }
        a { color: #00d4aa !important; }
        a:hover { color: #00b894 !important; }
        pre, code { background-color: #2a2a2a !important; color: #e0e0e0 !important; }
        </style>
        """
        html_content = html_content.replace("<head>", f"<head>{custom_css}")
        
        # Save modified HTML
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        report_url = f"/reports/{html_filename}"
        return JSONResponse({
            "message": "EDA report generated successfully!",
            "report_url": report_url
        })
    
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
