import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as fs from "fs-extra";
import QueryHelper from "./QueryHelper";
import DataSetHelper from "./DataSetHelper";
import RoomHelper from "./RoomHelper";
import {CourseSection} from "../model/CourseSection";
import {expect} from "chai";

const dataDir = "./data/datasets";
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public id_list: string[];
	public insightDataList: InsightDataset[];
	public dh: DataSetHelper;
	public rh: RoomHelper;
	public queryHelper: QueryHelper;

	constructor() {
		console.trace("InsightFacadeImpl::init()");
		this.id_list = [];
		this.dh = new DataSetHelper();
		this.rh = new RoomHelper();
		this.insightDataList = [];
		this.queryHelper = new QueryHelper();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]>( (resolve,reject) => {
			if (id.includes("_")) {
				return reject(new InsightError("it contains an underscore"));
			}
			if (id === "") {
				return reject(new InsightError("it is whitespace"));
			}
			// TODO idList read from disk
			if (this.id_list.includes(id)){
				return reject(new InsightError("the id is already exist"));
			}

			if (!(fs.existsSync("./data/"))) {
				fs.mkdirSync("./data/");
				return resolve(this.id_list);
			} else {
				const helper = kind === InsightDatasetKind.Courses ? this.dh : this.rh;
				const path = kind === InsightDatasetKind.Courses ? this.insightPath : this.roomInsightPath;
				helper.SetData(id, content, kind).then(() => {
					this.insightDataList.push(helper.InsideDataList[helper.InsideDataList.length - 1]);
					this.id_list.push(id);
					this.writeInsight(path, this.insightDataList).then(()=>{
						return resolve(this.id_list);
					});
				}).catch((err)=> reject(err));
				// TODO save idList onto disk
			}
		});
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise<string> ((resolve,reject) => {
			if (id === null || id.trim() === "" || id.includes("_")) {
				return reject(new InsightError("id invalid"));
			}
			if (this.id_list.indexOf(id) === -1){
				return reject(new NotFoundError("no such id exist"));
			}
			this.dh.RemoveData(id)
				.then((deletedId) => {
					this.id_list = this.id_list.filter((e) => e !== deletedId);
					this.insightDataList = this.insightDataList.filter((i) => i.id !== deletedId);
					this.writeInsight(this.insightPath, this.insightDataList).then(()=>{
						return resolve(deletedId);
					});
				})
				.catch((err) => reject(err));
		});
	}

	private roomInsightPath: string = "./data/roomInsight.json"

	private insightPath: string = dataDir + "/insight.json"

	private async readInsight(path: string) {
		await fs.readJson(path, (err, obj) => {
			if (err) {
				console.error(err);
				return;
			}
			this.insightDataList = obj;
		});
	}

	private async writeInsight(path: string, dataList: any[]) {
		await fs.writeJson(path, dataList, (err) => {
			if (err) {
				console.error(err);
				return;
			}
		});
	}

	public performQuery(query: any): Promise<any[]> {
		const courseData = this.dh.loadDataFromCache();
		const roomData = this.rh.RoomSections;
		return new Promise<any[]> ((resolve,reject) => {
			this.queryHelper.queryAllData(query, courseData, roomData)
				.then((result: any[]) => {
					return resolve(result);
				})
				.catch((err) => reject(err));
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		// return Promise.resolve(this.rh.InsideDataList);
		return Promise.resolve(this.insightDataList);
	}
}
