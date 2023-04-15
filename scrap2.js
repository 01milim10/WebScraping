const puppeteer = require("puppeteer");
const fs = require("fs/promises");
const ObjectsToCsv = require("objects-to-csv");

async function start() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  console.log("Scraping Started");
  process.stdout.write("Scraping ");
  //   const colleges = await scrape(page);
  //   await fs.writeFile("colleges.txt", colleges.join(",\r\n"));

  await scrapeColleges(page);

  await browser.close();
}

async function scrape(page) {
  let names = [];
  for (let index = 1; index <= 99; index++) {
    index == 99 ? process.stdout.write("✅") : process.stdout.write("-");
    await page.goto(`https://www.aacsb.edu/accredited?page=${index}`);
    const colleges = await page.$$eval("a.member-search-result", (items) => {
      return items.map((x) => x.href);
    });
    names.push(...colleges);
  }
  console.log("\nScraping Finished");
  return names;
}

async function scrapeColleges(page) {
  let collegeData = [];
  const contents = await fs.readFile("colleges.txt", "utf-8");
  const colleges = contents.split(/\r?\n/);

  for (const [index, value] of colleges.entries()) {
    process.stdout.write("-");
    let collegeInfo = {};
    await page.goto(value);
    collegeInfo["#"] = index + 1;
    collegeInfo["AACB Web Link"] = value;
    collegeInfo["Name"] = await page.evaluate(() => {
      const item = document.querySelector(
        "h1.educational-member-detail-hero__title"
      );
      if (item !== null) {
        return item.textContent.trim();
      } else return "";
    });
    collegeInfo["Logo"] = await page.evaluate(() => {
      const item = document.querySelector(
        "div.educational-member-detail-hero__logo-wrapper > img"
      );
      if (item !== null) {
        return item.src;
      } else return "";
    });
    const collegeProgramDeliveryOptionsRaw = await page.$$eval(
      "div.educational-member-detail-hero__info-section > div.educational-member-detail-hero__info-text",
      (items) => {
        if (items !== null) {
          return items.map((x) => x.innerText.trim());
        } else return "";
      }
    );
    collegeInfo["Format"] = collegeProgramDeliveryOptionsRaw[0];
    collegeInfo["# of Student"] = collegeProgramDeliveryOptionsRaw[1];
    collegeInfo["ProgramDeliveryOptions"] = collegeProgramDeliveryOptionsRaw[2];
    collegeInfo["Website"] = await page.evaluate(() => {
      const item = document.querySelector(
        "div.educational-member-detail-body__sidebar-section > a.educational-member-detail-body__sidebar-website"
      );
      if (item !== null) {
        return item.href;
      } else return "";
    });

    collegeInfo["MainCampus"] = await page.evaluate(() => {
      const item = document.querySelector(
        "div.educational-member-detail-body__sidebar-address"
      );
      if (item !== null) {
        return item.innerText.trim().replace("\nView on Map", "");
      } else return "";
    });
    const rawCountry = collegeInfo["MainCampus"].split(",");
    collegeInfo["Country"] = rawCountry[rawCountry.length - 1];
    collegeInfo["State"] =
      collegeInfo["Country"].trim() == "United States"
        ? rawCountry[rawCountry.length - 2].split("\n")[0]
        : "";

    const collegeEducationRaw = await page.$$eval(
      "div.educational-member-detail-body__sidebar-education",
      (items) => {
        if (items !== null) {
          return items.map((x) => x.innerText.trim());
        } else return "";
      }
    );
    collegeInfo["Education"] = collegeEducationRaw.join(",\n ").trim();
    collegeInfo["Accreditation"] = await page.evaluate(() => {
      const item = document.querySelector(
        "div.educational-member-detail-body__sidebar-school-type-title"
      );
      if (item !== null) {
        return item.innerText;
      } else return "";
    });
    const collegeProgramsRaw = await page.evaluate(() => {
      let programs = {};
      const items = document.querySelectorAll("div.data-table-section");
      items.forEach((item) => {
        const programType = item.innerText.trim();
        if (programType === "Undergraduate") {
          const table = Array.from(
            item.querySelectorAll(
              "div > div > table > tbody > tr > td> div > div"
            )
          );

          programs["Programs-Undergraduate"] = table
            .map((item) => item.innerText.trim())
            .join(",\n");
        } else if (programType === "Graduate") {
          const table = Array.from(
            item.querySelectorAll(
              "div > div > table > tbody > tr > td> div > div"
            )
          );
          programs["Programs-Graduate"] = table
            .map((item) => item.innerText.trim())
            .join(",\n");
        } else if (programType === "Doctorate") {
          const table = Array.from(
            item.querySelectorAll(
              "div > div > table > tbody > tr > td> div > div"
            )
          );
          programs["Programs-Doctoral"] = table
            .map((item) => item.innerText.trim())
            .join(",\n");
        }
      });
      return programs;
    });
    collegeInfo = { ...collegeInfo, ...collegeProgramsRaw };

    const collegeProgramOptionsRaw = await page.$$eval(
      "div.data-table__footer-text > ul",
      (items) => {
        if (items !== null) {
          return items.map((x) => x.innerText.trim());
        } else return "";
      }
    );
    collegeInfo["ProgramFormats"] = collegeProgramOptionsRaw[1];

    collegeInfo["VisionMission"] = await page.evaluate(() => {
      const item = document.querySelector(
        "div.educational-member-detail-body__quote"
      );
      if (item !== null) {
        return item.textContent.trim();
      } else return "";
    });
    collegeInfo["Description"] = await page.evaluate(() => {
      const item = document.querySelector(
        "div.educational-member-detail-body__text"
      );
      if (item !== null) {
        return item.textContent.trim();
      } else return "";
    });

    collegeData.push(collegeInfo);
  }
  process.stdout.write("✅");
  console.log("\nScraping Finished");

  const csv = new ObjectsToCsv(collegeData);
  await csv.toDisk("./CollegeData.csv");
}

start();
