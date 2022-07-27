// import {InsightDataset, InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
// import * as JSZip from "jszip";
// import * as fs from "fs-extra";
// // import JSON = Mocha.reporters.JSON;
// // import CourseSection from "./CourseSection";
//
// const dataDir = "./data/datasets";
// const recordDir = "./data/RecordSets";
// const CourseSectionDir = "./data/CourseSection";
//
// export default class Load {
// 	public InsightDataList: InsightDataset[];
// 	public sectionList: CourseSection[];
// 	public idList: string[];
// 	public RecordList: any;
// 	public dataSet: any;
// 	public CourseSecList: any;
//
// 	public constructor(){
// 		this.InsightDataList = [];
// 		this.idList = [];
// 		this.sectionList = [];
// 		this.RecordList = null;
// 		this.CourseSecList = null;
// 		this.dataSet = null;
// 	}
// 	public PresentLoad() {
// 		if (!fs.existsSync(dataDir)) {
// 			fs.mkdir(dataDir);
// 		}
// 		let datafile = fs.readFileSync(dataDir, "utf-8");
// 		this.dataSet = JSON.parse(datafile);
// 		this.idList = Object.keys(this.dataSet);
// 		if (!fs.existsSync(recordDir)) {
// 			fs.mkdir(recordDir);
// 		}
// 		let recordFile = fs.readFileSync(recordDir, "utf-8");
// 		this.RecordList = JSON.parse(recordFile);
// 		this.InsightDataList = [];
// 		for (let i = 0; i < this.idList.length; i++){
// 			this.InsightDataList[i] = this.RecordList[this.idList[i]];
// 		}
// 		if (!fs.existsSync(CourseSectionDir)) {
// 			fs.mkdir(CourseSectionDir);
// 		}
// 		let MockFile = fs.readFileSync(CourseSectionDir,"utf-8");
// 		this.CourseSecList = JSON.parse(MockFile);
// 		this.sectionList = [];
// 		for (let idlt of this.idList){
// 			for (let sec of this.CourseSecList[idlt]) {
// 				this.sectionList.push(sec);
// 			}
// 		}
// 	}
// }
