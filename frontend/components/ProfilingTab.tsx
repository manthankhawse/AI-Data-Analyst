"use client"
import { useParams } from "next/navigation";
const ProfilingTab = () => {
  const params = useParams()
  const projectId = params.id
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <iframe
        src={`http://localhost:8000/reports/${projectId}.html`}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="EDA Profiling Report"
      />
    </div>
  );
};

export default ProfilingTab;
