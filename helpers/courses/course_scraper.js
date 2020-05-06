const request = require("request-promise")
const cheerio = require("cheerio")
const fs = require("fs").promises
const fileExists = require("fs").existsSync
const path = require("path")

const BASE_SCI_URL = "http://courses.sci.pitt.edu"

async function getCourseListing() {
  const html = await request(`${BASE_SCI_URL}/courses`)
  const $ = cheerio.load(html)
  const $courses = $("ul").find("li.course.computer-science")
  const courseListing = $courses.toArray().map((li) => {
    const $a = cheerio.load(li)("a")
    const sci_href = BASE_SCI_URL + $a.attr("href")
    // fullTitle: CS 0447 COMPUTER ORGANIZATION AND ASSEMBLY LANGUAGE
    const fullTile = $a.text()
    // title: COMPUTER ORGANIZATION AND ASSEMBLY LANGUAGE
    const title = fullTile.split(" ").splice(2).join(" ")
    // id: CS 0447
    const id = fullTile.split(" ").slice(0, 2).join("").replace(/ /g, "")
    return {
      sci_href,
      title,
      id,
    }
  })
  return courseListing
}

// If the scraper is broken, it is very likely the
// SCI website changed, and that just something wrong
// with this function
async function scrapeCourseDescription(href) {
  const html = await request(href)
  const $ = cheerio.load(html)
  const $info = $("#main")
  const $textNodes = $info.contents().filter(() => true)
  // When this was made, there would be 'div's that contained
  // section info, and these would have class names on them
  const terms_offered = {
    SPRING: $info.find(".course.Spring").length > 0,
    FALL: $info.find(".course.Fall").length > 0,
    SUMMER: $info.find(".course.Summer").length > 0,
  }

  return {
    credits: Number($($textNodes[9]).text()) || 0,
    description: $($textNodes[11]).text(),
    requirements: $($textNodes[23]).text(),
    terms_offered,
  }
}

async function getAllCourseInfo() {
  const courseInfo = await getCourseListing()
  const descriptions = await Promise.all(
    courseInfo.map(async (metadata) => {
      const { sci_href, id } = metadata
      console.log("Fetching", id)
      const courseInfo = await scrapeCourseDescription(sci_href)
      return { ...metadata, ...courseInfo }
    })
  )
  return descriptions
}

const GATSBY_COURSE_PAGE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "src",
  "pages",
  "courses"
)

const AUTOGEN_COURSE_INFO_PATH = path.join(
  GATSBY_COURSE_PAGE_PATH,
  "autogenerated_course_info.json"
)

const COURSE_MARKDOWN_PATH = path.join(GATSBY_COURSE_PAGE_PATH, "markdown")

const localCourseInfo = require(AUTOGEN_COURSE_INFO_PATH).courses

async function scrapeSciCoursesAndGetLocal() {
  const remote = await getAllCourseInfo()
  const local = localCourseInfo
  const sortFn = (a, b) => a.id > b.id
  return {
    remote: remote.sort(sortFn),
    local: local.sort(sortFn),
  }
}

async function saveScrapedFileToFrontend() {
  const courses = await getAllCourseInfo()
  const toWrite = {
    metadata: {
      generated: new Date(),
    },
    courses,
  }
  await fs.writeFile(AUTOGEN_COURSE_INFO_PATH, JSON.stringify(toWrite, null, 2))
}

const markdownTemplateGen = (id, title) => `---
path: "/courses/${id}"
title: "${title}"
id: "${id}"
---

## Advice

`

async function generateMarkdownFiles() {
  localCourseInfo.forEach(async ({ id, title }) => {
    const filePath = path.join(COURSE_MARKDOWN_PATH, `${id}.md`)
    if (!fileExists(filePath)) {
      console.log(`Creating ${filePath}`)
      const markdown = markdownTemplateGen(id, title)
      await fs.writeFile(filePath, markdown)
    }
  })
}

const mode = process.argv[2]
if (mode === "--compare") {
  scrapeSciCoursesAndGetLocal()
} else if (mode === "--save") {
  saveScrapedFileToFrontend()
} else if (mode === "--generatemarkdown") {
  generateMarkdownFiles()
}

module.exports = {
  scrapeCourseDescription,
  scrapeSciCoursesAndGetLocal,
}
