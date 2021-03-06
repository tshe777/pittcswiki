const categorize = require("../src/utils/course-categorizer")

test("Course categorizer", () => {
  const courses = Array(100)
    .fill(1)
    .map((_, i) => ({ id: "TEST" + (i + 1000), title: "Test " + i }))
    .filter((course) => course.id != "TEST1008")

  const categories = [
    {
      courses: ["TEST1002", "TEST1003", "TEST1004"],
    },
    {
      courses: ["TEST1005 - 1009"],
    },
    {
      courses: ["TEST1090"],
    },
  ]
  const categorized = categorize(courses, categories)
  expect(categorized[0].courses).toEqual([
    { id: "TEST1002", title: "Test 2" },
    { id: "TEST1003", title: "Test 3" },
    { id: "TEST1004", title: "Test 4" },
  ])
  expect(categorized[1].courses).toEqual([
    { id: "TEST1005", title: "Test 5" },
    { id: "TEST1006", title: "Test 6" },
    { id: "TEST1007", title: "Test 7" },
    { id: "TEST1009", title: "Test 9" },
  ])
})
