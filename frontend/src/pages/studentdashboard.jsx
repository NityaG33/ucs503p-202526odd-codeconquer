import { useEffect, useState } from "react";
import api from "../api";

export default function StudentDashboard(){
  const [mealId, setMealId] = useState(1);
  const [status, setStatus] = useState("");
  const rollNo = sessionStorage.getItem("student_roll") || "";
  const hostelId = sessionStorage.getItem("student_hostel") || "";

  // optional: show name by calling your backend later if needed

  const sendNo = async () => {
    if (!rollNo || !hostelId) return alert("Missing roll/hostel from login");
    try{
      const res = await api.post("/api/no", {
        rollNo, hostelId, mealId, reason: "Not coming"
      });
      if (res.data?.ok) {
        setStatus("Saved NO successfully ✔");
      } else {
        setStatus("Server responded but not OK");
      }
    }catch(e){
      console.error(e);
      setStatus("Failed to save NO");
    }
  };

  return (
    <div className="wrap" style={{paddingTop:24}}>
      <div className="heading">Student Dashboard</div>
      <div className="card" style={{maxWidth:640}}>
        <div className="muted" style={{marginBottom:8}}>
          Logged in as <b>{rollNo || "Unknown"}</b> ({hostelId || "N/A"})
        </div>
        <label>Choose Meal</label>
        <select className="input" style={{margin:"8px 0 12px"}} value={mealId} onChange={e=>setMealId(Number(e.target.value))}>
          <option value={1}>1 (Lunch)</option>
          <option value={2}>2 (Dinner)</option>
        </select>
        <button className="btn" onClick={sendNo}>I am NOT coming (Save NO)</button>
        {status && <div className="hint" style={{marginTop:10}}>{status}</div>}
      </div>
    </div>
  );
}
