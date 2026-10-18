# Model Evaluation & Limitations: Anomaly Detection

## 1. Model Overview
The anomaly detection module uses a **transparent statistical baseline** rather than a black-box neural network. It calculates the Delta NDVI by subtracting the January 2024 NDVI from the June 2024 NDVI.

**Rule:** `Delta = NDVI(June) - NDVI(January)`
**Threshold:** Pixels with a `Delta < -0.15` are flagged as anomalies (Red).

## 2. Why this approach?
*   **Interpretability:** A statistical threshold is easily explainable to a farmer or agronomist. They know exactly *why* a pixel is red.
*   **Low Compute:** It runs instantly on a standard 16GB RAM laptop without a GPU.
*   **Baseline for future ML:** This rule-based approach creates a labeled dataset (Anomaly vs. Normal) that can later be used to train a more complex supervised machine learning model (e.g., Random Forest) when ground-truth field data is collected.

## 3. Limitations & False Positives
*   **Harvesting:** If a farmer harvested their maize between January and June, the NDVI will drop significantly. The model will flag this as an "Anomaly," even though it is a normal agricultural practice.
*   **Cloud Artifacts:** Despite cloud masking, residual atmospheric interference can cause false drops in NDVI.
*   **No Causal Inference:** The model detects *where* vegetation was lost, but cannot determine *why* (e.g., drought, pest, disease, fire). Field verification is strictly required.