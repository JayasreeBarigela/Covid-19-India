const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
const convertStatesDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictsDbObjectToResponseObject = (eachDistrict) => {
  return {
    districtId: eachDistrict.district_id,
    districtName: eachDistrict.district_name,
    stateId: eachDistrict.state_id,
    cases: eachDistrict.cases,
    cured: eachDistrict.cured,
    active: eachDistrict.active,
    deaths: eachDistrict.deaths,
  };
};

// Get States API
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state
    ORDER BY
      state_id;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStatesDbObjectToResponseObject(eachState)
    )
  );
});

// Get State API
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
      *
    FROM
      state
    where
      state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertStatesDbObjectToResponseObject(state));
});

// Add District API
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `insert into 
  district (district_name,state_id,cases,cured,active,deaths)
  values('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

// Get Districts API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictsQuery = `
    SELECT
      *
    FROM
      district
    where
      district_id =${districtId};`;
  const districtDetails = await db.get(getDistrictsQuery);
  response.send(convertDistrictsDbObjectToResponseObject(districtDetails));
});

//Delete District API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    delete from district where district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Update District API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
        update district set 
            district_name= '${districtName}',
            state_id= ${stateId},
            cases= ${cases},
            cured= ${cured},
            active= ${active},
            deaths= ${deaths}
            where
            district_id = ${districtId};
        `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//Get Stats API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
    select sum(cases) as totalCases,
    sum(cured) as totalCured,
    sum(active) as totalActive,
    sum(deaths) as totalDeaths
    from 
    district
    where state_id =${stateId}
    group by state_id;
    `;
  const stats = await db.get(getStatsQuery);
  response.send(stats);
});

//Get State Name of The District API
app.get("districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetailsQuery = `
    select state.state_name as stateName
    from district join state
    where district.district_id = ${districtId};
    `;
  const state = await db.get(getDistrictDetailsQuery);
  response.send(state);
});

module.exports = app;
