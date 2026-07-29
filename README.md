<h1>
  <img src="./frontend/public/logo.png" alt="StreetIQ Logo" width="48" align="left" style="margin-right: 16px;" />
  StreetIQ
</h1>
<br/>

**The AI-Powered Road Intelligence & Navigation Platform**

---

## Demo Video
[![StreetIQ Demo Video](https://img.youtube.com/vi/lJVnyaPadkw/0.jpg)](https://www.youtube.com/watch?v=lJVnyaPadkw)

---

## What does StreetIQ do?
StreetIQ is a next-generation navigation and road monitoring platform. While conventional maps tell you how to get from point A to point B, StreetIQ tells you **what is actually on the road**. 

We provide smooth, real-time turn-by-turn navigation overlayed with live crowdsourced hazard data—such as potholes, waterlogging, severe cracks, and debris.

## The Problem It Solves
Millions of people face unpredictable road conditions daily, especially in developing regions.
- **Safety Risks:** Hidden potholes and sudden debris lead to severe accidents and vehicle damage.
- **Blind Navigation:** Standard navigation apps assume all roads are perfect, completely ignoring temporary hazards or severe road degradation.
- **Data Collection Bottleneck:** Municipalities and road authorities lack the workforce to actively monitor thousands of kilometers of roads in real-time.

## The Solution & How It Works
StreetIQ solves this by turning every driver into an active road surveyor—without requiring them to do any manual work.

1. **On-Device AI Inference:** As you navigate, you can activate the AI dashcam. Using a highly optimized, lightweight **YOLOv8** model running entirely in your browser (via TensorFlow.js), the app scans the road ahead at a stable 15fps.
2. **Absolute Privacy:** Video feeds are **never** sent to a server. Only the GPS coordinates and hazard metadata are transmitted when a hazard is confidently detected.
3. **Smart Motion Gating:** AI inference only runs when you are actively moving (> 2 km/h). It automatically pauses at traffic lights to save battery and prevent duplicate reports.
4. **Real-Time Distribution:** The moment a hazard is detected by a user, our WebSockets and Supabase backend instantly broadcast the hazard to the maps of every other driver in the area.

---

## We Built & Trained Our Own Model
We didn't just plug in a generic pre-trained API. We **hand-trained our own state-of-the-art YOLOv8 model** specifically calibrated for complex Indian road conditions. Our model is highly tuned to identify `cracks`, `potholes`, `waterlogging`, and `debris` in real-time under various lighting conditions.

### Dataset & Ground Truth Distribution
Before training, we curated and labeled thousands of real-world street images. Here is a glimpse of our raw training data, label distribution, and the human-verified ground truth annotations that our AI learned from:

| Dataset Labels Overview | Training Batch 0 | Training Batch 1 |
| :---: | :---: | :---: |
| <img src="./training/Full_StreetIQ_Training_Data/run1/labels.jpg" width="280"> | <img src="./training/Full_StreetIQ_Training_Data/run1/train_batch0.jpg" width="280"> | <img src="./training/Full_StreetIQ_Training_Data/run1/train_batch1.jpg" width="280"> |
| **Label Stats:** Breakdown of the various hazard classes and their bounding box sizes in our dataset. | **Training Data:** Raw dashcam footage with ground truth annotations. | **Training Data:** Complex scenarios including heavy traffic and road degradation. |

| Training Batch 2 | Validation Labels 0 | Validation Labels 1 |
| :---: | :---: | :---: |
| <img src="./training/Full_StreetIQ_Training_Data/run1/train_batch2.jpg" width="280"> | <img src="./training/val_batch0_labels.jpg" width="280"> | <img src="./training/val_batch1_labels.jpg" width="280"> |
| **Training Data:** Focus on varied lighting and camera angles. | **Validation Target:** Unseen batch 0 ground truth targets. | **Validation Target:** Unseen batch 1 ground truth targets. |

| Validation Labels 2 | | |
| :---: | :---: | :---: |
| <img src="./training/val_batch2_labels.jpg" width="280"> | | |
| **Validation Target:** Unseen batch 2 ground truth targets. | | |

### Real-World AI Validation (Predictions)
Here is how our trained AI performs on that unseen validation dashcam footage, successfully drawing accurate bounding boxes around hazards:

| Validation Prediction 0 | Validation Prediction 1 | Validation Prediction 2 |
| :---: | :---: | :---: |
| <img src="./training/val_batch0_pred.jpg" width="280"> | <img src="./training/val_batch1_pred.jpg" width="280"> | <img src="./training/val_batch2_pred.jpg" width="280"> |
| Identifying severe cracks on high-speed roads. | Spotting deep potholes masked by shadows. | Detecting waterlogging and debris in dense traffic. |

### Comprehensive Training Metrics
Our model underwent rigorous evaluation to ensure it can run efficiently in the browser without sacrificing safety or accuracy.

| Precision-Recall Curve | F1 Confidence Curve | Precision Curve |
| :---: | :---: | :---: |
| <img src="./training/BoxPR_curve.png" width="280"> | <img src="./training/BoxF1_curve.png" width="280"> | <img src="./training/BoxP_curve.png" width="280"> |
| **Precision vs Recall:** High area under the curve proves our model accurately balances detecting true hazards while ignoring false positives. | **F1 Score:** Demonstrates peak model performance and reliability across varying confidence thresholds. | **Precision Strictness:** Shows our model's strictness in only predicting actual hazards, minimizing false alarms for drivers. |

| Recall Curve | Confusion Matrix | Normalized Confusion Matrix |
| :---: | :---: | :---: |
| <img src="./training/BoxR_curve.png" width="280"> | <img src="./training/confusion_matrix.png" width="280"> | <img src="./training/confusion_matrix_normalized.png" width="280"> |
| **Recall Rate:** Proves our model successfully catches the vast majority of real hazards present on the road. | **Raw Accuracy:** Absolute counts of true positives vs false positives across all hazard classes. | **Class Differentiation:** Shows pinpoint percentage accuracy in distinguishing between specific classes (e.g. shadow vs pothole). |

---

## Tech Stack

**Frontend:**
- React (Vite)
- TensorFlow.js (In-browser YOLO inference)
- React-Leaflet (Map rendering)

**Backend:**
- Node.js & Express (TypeScript)
- OSRM (Open Source Routing Machine) with custom traffic multipliers
- Photon / Komoot (Global Geocoding)
- WebSockets (Real-time tracking)

**Database & Cloud:**
- Supabase (PostgreSQL + PostGIS for spatial queries)
- Supabase Realtime (Hazard broadcasts)

---

## Local Setup & Installation

Follow these steps to run StreetIQ locally on your machine.

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Supabase Project (for database and realtime features)

### 1. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory and configure the following variables:
   ```env
   PORT=3001
   ALLOWED_ORIGINS=http://localhost:5173
   GEMINI_API_KEY=your_gemini_api_key_here
   OSRM_URL=https://router.project-osrm.org
   PHOTON_URL=https://photon.komoot.io
   NODE_ENV=development
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the frontend folder in a new terminal:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` directory and add your Supabase and Backend URLs:
   ```env
   VITE_BACKEND_URL=http://localhost:3001
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the frontend application:
   ```bash
   npm run dev
   ```
   The app will typically run on `http://localhost:5173`.

---

## File Structure & Responsibilities

Understanding the repository structure will help you navigate the codebase efficiently:

- **`frontend/`**: The React + Vite web application. Contains UI components, map integration (Leaflet), and TensorFlow.js inference logic (e.g., `src/components/VideoAnalysis.jsx`).
- **`backend/`**: The Node.js + Express server handling API requests, WebSocket connections for real-time tracking, and wrappers for Geocoding/Routing (e.g., `src/services/`).
- **`training/`**: Documentation, metrics, and data related to our custom YOLOv8 model training.

### ⚠️ Restricted Files & Contribution Guidelines
As StreetIQ is an open-source project, certain files related to core infrastructure, administration, and internal credentials **must not be modified** by external contributors. Please ensure your pull requests do not alter the following:

1. **Supabase & Database Configuration:**
   - The entire `supabase/` directory (Migrations and database schemas)
   - `frontend/src/supabaseClient.js` (Database connection configuration)
2. **Admin & Government Panels:**
   - `frontend/src/pages/AdminDashboard.jsx`
   - `frontend/src/pages/AdminLoginPage.jsx`
   - `frontend/src/pages/GovDashboard.jsx`
   - `frontend/src/pages/GovLoginPage.jsx`
3. **Internal Documents & Assets:**
   - Any internal company files, including **ID cards**, **offer letters**, or proprietary internal assets, are strictly restricted and not to be touched.

By adhering to these guidelines, we can ensure the security and stability of the platform for everyone.
