import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
// import JSON = Mocha.reporters.JSON;
import {CourseItem, CourseSection} from "../model/CourseSection";
import InsightFacade from "./InsightFacade";
// import JSZip from "jszip";
let JSZip = require("jszip");

const dataDir = "./data/datasets";
const recordDir = "./data/RecordSets";
const CourseSectionDir = "./data/CourseSection";


export default class DataSHelper {
	private zip = JSZip();
	public idList: string[];
	public courseList: CourseSection[];
	public InsideDataList: InsightDataset[];
	public InsideMap = new Map();
	public CourseSectionMap = new Map();
	public CourseSections = {} as CourseItem;
	public constructor() {
		this.courseList = [];
		this.idList = [];
		this.InsideDataList = [];
	}


	public SetData(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]> ((resolve, reject) => {
			return this.ZipExaminor(content).then((res: any) => {
				const a = res.folder(/courses/);
				let courseFiles: Array<Promise<any>> = [];
				if (a === null) {
					return reject("no fold names courses");
				}
				Object.keys(res.files)?.forEach((file: any) => courseFiles.push(res.file(file)?.async("text")));
				// console.log("before promise all" + courseFiles);
				return Promise.all(courseFiles).then((Jasonfiles) => {
					if (Jasonfiles.length === 0) {
						return reject(new InsightError("empty zip file"));
					}
					let ContentList: any[] = [], courseSecList: CourseSection[] = [], numRows: number = 0;
					for (let jasonfile of Jasonfiles) {
						if ( jasonfile === undefined) {
							continue;
						}
						try {
							const randomCourse = JSON.parse(jasonfile);
							let realContent = randomCourse["result"];
							numRows = numRows + realContent.length;
							courseSecList = this.processFiles(courseSecList, realContent);
						} catch (e) {
							// reject(new InsightError(e));
						}
					}
					let thisDataset: InsightDataset = {id, kind: InsightDatasetKind.Courses, numRows: numRows};
					this.InsideDataList.push(thisDataset);
					this.idList.push(id);
					this.InsideMap.set(id,thisDataset);
					this.CourseSectionMap.set(id,courseSecList);
					this.CourseSections[id] = courseSecList;
					// console.log("61" + this.CourseSections);
					if (!fs.existsSync(dataDir)) {
						fs.mkdirSync(dataDir);
					}
					fs.writeFile(dataDir + "/" + id + ".json", JSON.stringify(ContentList));
					resolve(this.idList);
				});
			})
				.catch((e)=>reject(e));
		});
	}

	private processFiles(courseSecList: CourseSection[], realContent: any): CourseSection[] {
		for (let j of realContent) {
			let CourseObject: CourseSection = {
				dept: j["Subject"],
				avg: Number(j["Avg"]),
				id: j["Course"],
				year: Number(j["Year"]),
				pass: Number(j["Pass"]),
				fail: Number(j["Fail"]),
				title: j["Title"],
				instructor: j["Professor"],
				audit: Number(j["Audit"]),
				uuid: Number(j["id"]).toString(),
			} as CourseSection;
			courseSecList.push(CourseObject);
			this.courseList.push(CourseObject);
		}
		return courseSecList;
	}


	public ZipExaminor(content: string): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.zip.loadAsync(content, {base64: true, createFolders: true}).then((Data: any) => {
				return resolve(Data);
			}).catch(() => {
				return reject(new InsightError("invalid zip"));
			});
		});
	}


	public RemoveData(id: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			let inx = this.idList.indexOf(id);
			delete this.idList[inx];
			this.InsideMap.delete(id);
			this.CourseSectionMap.delete(id);
			delete this.CourseSections[id];
			fs.remove(dataDir + "/" + id + ".json").then(() => {
				resolve(id);
			}).catch((err) => {
				return reject("dataset remove process have error");
			});
		});
	}

	// loads all data from disk and save into object arrays
	public loadDataFromCache(): any {
		// for DEBUG
		// let undefinedCounter = 0;
		// for (let i of this.CourseSections["courses"]) {
		// 	if (i["id"] !== undefined) {
		// 		console.log("course sections dept " + i["id"]);
		// 	} else {
		// 		undefinedCounter += 1;
		// 	}
		// }
		// if (undefinedCounter === this.CourseSections["courses"].length) {
		// 	console.log("all courses have undefined section id");
		// }
		return this.CourseSections;
	}

	private loadJSON(path: string, fileName: string): Promise<any> {
		return new Promise((resolve, reject) => {
			fs.readJson(path + fileName, (err, obj) => {
				if (err) {
					return reject(err);
				}
				this.courseList.push(obj);
				resolve(obj);
			});
		});
	}

	public list(): Promise<InsightDataset[]> {
		return Promise.all(this.InsideDataList);
	}

	public listForMap(): Promise<Map<string, CourseSection[]>> {
		return Promise.resolve(this.CourseSectionMap);
	}
}
