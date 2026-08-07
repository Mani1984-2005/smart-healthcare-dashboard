import express from "express";
import pool from "../db.js";

const router = express.Router();

function normalizeGender(value) {
  const gender = String(value || "Other").trim();

  if (
    gender === "Female" ||
    gender === "Male" ||
    gender === "Other"
  ) {
    return gender;
  }

  return "Other";
}


function normalizeStatus(value) {
  const status = String(value || "Active").trim();

  const allowed = [
    "Active",
    "Inactive",
    "Discharged",
    "Under Observation",
    "Critical"
  ];

  return allowed.includes(status)
    ? status
    : "Active";
}


function normalizeDate(value) {

  if (!value) {
    return new Date()
      .toISOString()
      .split("T")[0];
  }


  try {

    return new Date(value)
      .toISOString()
      .split("T")[0];

  } catch {

    return new Date()
      .toISOString()
      .split("T")[0];

  }

}



function normalizePatient(record) {

  return {

    id: String(record.id),

    fullName:
      record.full_name ||
      record.fullName ||
      record.name ||
      "Unnamed Patient",


    age:
      Number(record.age ?? 0),


    gender:
      normalizeGender(record.gender),


    phone:
      record.phone || "",


    email:
      record.email || "",


    bloodGroup:
      record.blood_group ||
      record.bloodGroup ||
      "",


    address:
      record.address ||
      "",



    medicalHistory:

      Array.isArray(record.medical_history)

        ? record.medical_history


        : Array.isArray(record.medicalHistory)

          ? record.medicalHistory


          : record.medicalHistory

            ? String(record.medicalHistory)
                .split(",")
                .map(item => item.trim())
                .filter(Boolean)

            : [],



    registrationDate:

      normalizeDate(
        record.registration_date ||
        record.created_at
      ),



    status:
      normalizeStatus(record.status)

  };

}




// GET ALL PATIENTS

router.get("/", async (req,res)=>{

  try {

    const result = await pool.query(
      "SELECT * FROM patients ORDER BY id DESC"
    );


    res.json(
      result.rows.map(normalizePatient)
    );


  } catch(error){

    res.status(500).json({
      message:error.message
    });

  }

});





// GET SINGLE PATIENT

router.get("/:id", async(req,res)=>{

try{


const patientId = Number(req.params.id);


if(!Number.isInteger(patientId)){
return res.status(400).json({
message:"Invalid patient id"
});
}



const result = await pool.query(

"SELECT * FROM patients WHERE id=$1",

[patientId]

);



if(!result.rows[0]){

return res.status(404).json({
message:"Patient not found"
});

}



res.json(
normalizePatient(result.rows[0])
);



}catch(error){

res.status(500).json({
message:error.message
});

}


});





// CREATE PATIENT

router.post("/", async(req,res)=>{


try{


const payload=req.body || {};


const result = await pool.query(

`
INSERT INTO patients
(name,age,gender,phone)
VALUES($1,$2,$3,$4)
RETURNING *
`,

[

payload.fullName ||
payload.name ||
"Unnamed Patient",


Number(payload.age) || 0,


normalizeGender(payload.gender),


payload.phone || ""

]

);



res.status(201).json(

normalizePatient(result.rows[0])

);



}catch(error){


res.status(500).json({
message:error.message
});


}



});





// UPDATE PATIENT


router.put("/:id", async(req,res)=>{


try{


const patientId = Number(req.params.id);


const payload=req.body;


const result = await pool.query(

`
UPDATE patients

SET

name=$1,
age=$2,
gender=$3,
phone=$4

WHERE id=$5

RETURNING *

`,

[

payload.fullName ||
payload.name,

Number(payload.age),

normalizeGender(payload.gender),

payload.phone || "",

patientId

]

);



if(!result.rows[0]){

return res.status(404).json({
message:"Patient not found"
});

}



res.json(

normalizePatient(result.rows[0])

);



}catch(error){

res.status(500).json({
message:error.message
});

}



});





// DELETE PATIENT


router.delete("/:id", async(req,res)=>{


try{


const patientId = Number(req.params.id);



const result = await pool.query(

"DELETE FROM patients WHERE id=$1 RETURNING id",

[patientId]

);



if(!result.rows[0]){

return res.status(404).json({
message:"Patient not found"
});

}



res.json({

success:true,

message:"Patient deleted"

});



}catch(error){


res.status(500).json({
message:error.message
});


}



});





export default router;