import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [role, setRole] = useState("");
  const [rollNo, setRollNo] = useState("");     // for student
  const [hostelId, setHostelId] = useState(""); // for student
  const [staffCode, setStaffCode] = useState(""); // dummy for staff

  const handleGo = () => {
    if (role === "student") {
      if (!rollNo || !hostelId) return alert("Enter Roll No and Hostel ID");
      // (Optional) store in session for later use
      sessionStorage.setItem("student_roll", rollNo);
      sessionStorage.setItem("student_hostel", hostelId);
      nav("/student");
    } else if (role === "staff") {
      // simple placeholder check; you can replace with real auth later
      if (staffCode.trim() === "") return alert("Enter staff access code");
      nav("/staff");
    } else {
      alert("Select Student or Staff");
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="login-title">Hostel Mess Management</h1>
        <div className="login-sub">Choose your role & continue</div>

        <div className="role-grid">
          <button className={`role-btn ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")}>
            Student
          </button>
          <button className={`role-btn ${role === "staff" ? "active" : ""}`} onClick={() => setRole("staff")}>
            Staff
          </button>
        </div>

        {role === "student" && (
          <>
            <div style={{marginBottom:10}}>
              <label>Roll No</label>
              <input className="input" placeholder="e.g. S001" value={rollNo} onChange={e=>setRollNo(e.target.value)} />
            </div>
            <div style={{marginBottom:14}}>
              <label>Hostel ID</label>
              <input className="input" placeholder="e.g. H1" value={hostelId} onChange={e=>setHostelId(e.target.value)} />
            </div>
          </>
        )}

        {role === "staff" && (
          <div style={{marginBottom:14}}>
            <label>Staff Access Code</label>
            <input className="input" placeholder="Enter code" value={staffCode} onChange={e=>setStaffCode(e.target.value)} />
            <div className="hint">*No real auth yet – just for routing</div>
          </div>
        )}

        <button className="btn" onClick={handleGo}>Continue</button>
      </div>
    </div>
  );
}
