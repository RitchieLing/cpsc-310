import {
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {testFolder} from "@ubccpsc310/folder-test";
import {expect} from "chai";

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses/courses.zip",
		cour: "./test/resources/archives/courses/courses.zip",
		coursesWithInvalidJSON: "./test/resources/archives/courses/coursesWithInvalidJSON.zip",
		zool: "./test/resources/archives/courses/zool.zip",
		rooms: "./test/resources/archives/rooms.zip"
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		const insightDatasetCourses = [{
			id: "courses",
			kind: InsightDatasetKind.Courses,
			numRows: 64612
		}];
		const insightDatasetCoursesTwo = [{
			id: "courses-2",
			kind: InsightDatasetKind.Courses,
			numRows: 64612
		}];
		const id: string = "courses";
		const idTwo: string = "courses-2";
		const idCoursesWithInvalidJSON: string = "coursesWithInvalidJSON";

		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
			if (!fs.existsSync(persistDir)) {
				fs.mkdirSync(persistDir);
			}
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
			if(!fs.existsSync(persistDir)){
				fs.mkdirSync(persistDir);
			}
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);

		});

		describe("Add dataset", function() {
			// This is a unit test. You should create more like this!
			it("Should add a valid dataset", function () {
				const content: string = datasetContents.get(id) ?? "";
				const expected: string[] = [id];
				return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
					expect(result).to.deep.equal(expected);
				});
			});

			it("Should add a valid dataset that includes invalid JSON", function () {
				const content: string = datasetContents.get(idCoursesWithInvalidJSON) ?? "";
				return insightFacade.addDataset(idCoursesWithInvalidJSON, content, InsightDatasetKind.Courses)
					.then((result: string[]) => {
						expect(result).to.deep.equal([idCoursesWithInvalidJSON]);
					});
			});

			it("Add should be rejected for already existed id. ", async function () {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
					expect.fail("Should have rejected!");
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				}
			});
		});

		describe("Remove Dataset", function () {
			it("Should remove one dataset.", async function() {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				const expected: string = id;
				const result = await insightFacade.removeDataset(id);
				expect(result).to.deep.equal(expected);

				// check dataset is actually removed from disc
				const insightDatasets = await insightFacade.listDatasets();
				expect(insightDatasets).to.deep.equal([]);
			});

			it("Should remove multiple dataset.", async function() {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				await insightFacade.addDataset(idTwo, content, InsightDatasetKind.Courses);

				const removedId = await insightFacade.removeDataset(id);
				const removedIdTwo = await insightFacade.removeDataset(idTwo);

				const expected: string = id;
				const expectedTwo: string = idTwo;
				expect(removedId).to.deep.equal(expected);
				expect(removedIdTwo).to.deep.equal(expectedTwo);

				const insightDatasets = await insightFacade.listDatasets();
				expect(insightDatasets).to.be.deep.equal([]);
			});

			it("Remove should be rejected with not found error. ", async function () {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.removeDataset(idTwo);
					expect.fail("Should have rejected!");
				} catch (err) {
					expect(err).to.be.instanceof(NotFoundError);
				} finally {
					// make sure nothing is removed
					const insightDatasets = await insightFacade.listDatasets();
					expect(insightDatasets).to.deep.equal(insightDatasetCourses);
				}
			});

			it("Remove should be rejected for invalid id with underscore at the front. ", async function () {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.removeDataset("_courses");
					expect.fail("Should have rejected!");
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				} finally {
					// make sure nothing is removed
					const insightDatasets = await insightFacade.listDatasets();
					expect(insightDatasets).to.deep.equal(insightDatasetCourses);
				}
			});

			it("Remove should be rejected for invalid id with underscore in the middle. ", async function () {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.removeDataset("c_ourses");
					expect.fail("Should have rejected!");
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				} finally {
					// make sure nothing is removed
					const insightDatasets = await insightFacade.listDatasets();
					expect(insightDatasets).to.deep.equal(insightDatasetCourses);
				}
			});

			it("Remove should be rejected for invalid id with underscore at the back. ", async function () {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.removeDataset("courses_");
					expect.fail("Should have rejected!");
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				} finally {
					// nothing should be removed
					const insightDatasets = await insightFacade.listDatasets();
					expect(insightDatasets).to.deep.equal(insightDatasetCourses);
				}
			});

			it("Remove should be rejected for invalid id with all whitespaces. ", async function () {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.removeDataset("   ");
					expect.fail("Should have rejected!");
				} catch (err) {
					expect(err).to.be.instanceof(InsightError);
				} finally {
					// nothing should be removed
					const insightDatasets = await insightFacade.listDatasets();
					expect(insightDatasets).to.deep.equal(insightDatasetCourses);
				}
			});
		});

		describe("List Dataset", function() {
			it("Should list no dataset", function () {
				return insightFacade.listDatasets().then((insightDatasets) => {
					expect(insightDatasets).to.be.instanceof(Array);
					expect(insightDatasets).to.have.length(0);
				});
			});

			it("Should list one dataset", async function() {
				const content: string = datasetContents.get(id) ?? "";
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				const insightDatasets = await insightFacade.listDatasets();
				expect(insightDatasets).to.deep.equal(insightDatasetCourses);
			});

			it("Should list multiple dataset", function () {
				const content: string = datasetContents.get(id) ?? "";
				const expected = insightDatasetCourses.concat(insightDatasetCoursesTwo);
				return insightFacade.addDataset(id, content, InsightDatasetKind.Courses)
					.then(() => insightFacade.addDataset(idTwo, content, InsightDatasetKind.Courses))
					.then(() => insightFacade.listDatasets())
					.then((insightDatasets) => {
						// // using deep equal array will have problem as we don't know order of elements
						// expect(insightDatasets).to.be.an.instanceof(Array);
						// expect(insightDatasets).to.have.length(2);
						// const result =
						// 	insightDatasets.find((dataset) => dataset.id === id);
						// expect(result).to.exist;
						// expect(result).to.deep.equal(insightDatasetCourses);
						//
						// const resultTwo =
						// 	insightDatasets.find((dataset) => dataset.id === idTwo);
						// expect(resultTwo).to.exist;
						// expect(resultTwo).to.deep.equal(insightDatasetCoursesTwo);
						expect(insightDatasets).to.deep.equal(expected);
					});
			});
		});

	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
			if(!fs.existsSync(persistDir)){
				fs.mkdirSync(persistDir);
			}
			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
				insightFacade.addDataset("cour", datasetContents.get("cour") ?? "", InsightDatasetKind.Courses),
				// insightFacade.addDataset("zool", datasetContents.get("zool") ?? "", InsightDatasetKind.Courses)
				insightFacade.addDataset("rooms", datasetContents.get("rooms") ?? "", InsightDatasetKind.Rooms)
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		testFolder<any, any[], PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnResult(expected: any[], actual: any, input: any) {
					const orderKey = input.OPTIONS.ORDER;
					expect(actual).to.be.an.instanceof(Array);
					expect(actual).to.have.length(expected.length);
					expect(actual).to.have.deep.members(expected);
					// TODO check actual is sorted
					// if (orderKey !== undefined) {
					// 	// check the order of the actual array
					// 	for (let i = 1; i < actual.length; i = i + 1) {
					// 		actual[i - 1][orderKey] <= actual [i][orderKey];
					// 	}
					// }
				},
				assertOnError(expected, actual) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});
});
