import {InsightError} from "../controller/IInsightFacade";
import Decimal from "decimal.js";

export default class Option {
	private optionObj: any;
	private queryResult: any[];
	private isCourseDataset: boolean;

	constructor(isCourses: boolean) {
		this.queryResult = [];
		this.isCourseDataset = isCourses;
	}

	public performOption(results: any[], queryObj: any, currId: string): any[] {
		this.optionObj = queryObj["OPTIONS"];
		this.queryResult = this.appendId(results, currId);
		const transObj = queryObj["TRANSFORMATIONS"];
		if (transObj !== undefined) {
			let mapList = this.transformData(transObj);
			this.transformMapResult(mapList);
		}
		this.orderData();
		this.filterColumns();
		return this.queryResult;
	}

	// filter by columns
	public filterColumns(): void {
		let columns = this.optionObj["COLUMNS"];
		for (let col of columns) {
			Option.checkMixCourseRooms(col, this.isCourseDataset);
			// this.queryResult.forEach(function (section: any) {
			// 	if (col.split("_").length !== 2) { // aggregated column
			// 		section[col] = Number(section[col]);
			// 	}
			// });
		}
		if (columns !== undefined) {
			let result: any[] = [];
			for (let section of this.queryResult) {
				let sectionString = JSON.stringify(section, columns);
				let sectionObj = JSON.parse(sectionString);
				result.push(sectionObj);
			}
			this.queryResult = result;
		} else {
			// do not need to filter columns
		}
	}

	private appendId(results: any[], currId: string) {
		let resultsCopy = [];
		for (let section of results) {
			let sectionCopy: any = {};
			Object.assign(sectionCopy, section); // copy section so that it does not affect original data
			for (let oldKey of Object.keys(section)) {
				let newKey: string = currId + "_" + oldKey;
				sectionCopy[newKey] = sectionCopy[oldKey];
				delete sectionCopy[oldKey];
			}
			resultsCopy.push(sectionCopy);
		}
		return resultsCopy;
	}

	// order data by alphabets or numbers in creasing order
	private orderData() {
		const orderKey = this.optionObj["ORDER"];
		if (orderKey !== undefined) {
			if (typeof orderKey === "string") {
				Option.checkMixCourseRooms(orderKey, this.isCourseDataset);
				this.orderDataWithStringsAsc(orderKey);
			} else {
				for (let col of orderKey["keys"]) {
					Option.checkMixCourseRooms(col, this.isCourseDataset);
				}
				this.orderDataWithObject(orderKey);
			}
		}
	}

	private orderDataWithStringsAsc(colName: string) {
		// sort by section[sortKey] in this.filteredData
		this.queryResult.sort(function (a, b) {
			if (a[colName] < b[colName]) {
				return -1;
			} else if (a[colName] > b[colName]) {
				return 1;
			} else {
				return 0;
			}
		});
	}

	private orderDataWithObject(obj: any) {
		this.queryResult.sort(function (a, b) {
			for (let key of obj["keys"]) {
				if (a[key] !== b[key]) {
					if (obj["dir"] === "UP") {
						if (a[key] < b[key]) {
							return -1;
						} else if (a[key] > b[key]) {
							return 1;
						} else {
							return 0;
						}
					} else {
						if (a[key] < b[key]) {
							return 1;
						} else if (a[key] > b[key]) {
							return -1;
						} else {
							return 0;
						}
					}
				}
			}
			return 0;
		});
	}

	private transformData(transObj: any) {
		// create groups to apply aggregations
		let groupMapping = new Map(); // example key-value pair: "cpsc110": [section1, section2, section3]
		let resultMapping = new Map(); // example pair: "cpsc110": [{"avg": 100}, {"sum": 299}]
		const groupObj = transObj["GROUP"];
		for (let data of this.queryResult) {
			let newGroupKey = "";
			for (let key of groupObj) {
				Option.checkMixCourseRooms(key, this.isCourseDataset);
				newGroupKey = newGroupKey + String(data[key]);
			}
			if (groupMapping.has(newGroupKey)) {
				let groupToPush = groupMapping.get(newGroupKey);
				groupToPush.push(data);
				groupMapping.set(newGroupKey, groupToPush);
			} else {
				let newGroup = [];
				newGroup.push(data);
				groupMapping.set(newGroupKey, newGroup);
				resultMapping.set(newGroupKey, []);
			}
		}

		// aggregate
		const applyObj = transObj["APPLY"];
		const tempBool = this.isCourseDataset;
		applyObj.forEach(function (applyItem: any) {
			const applyKey = Object.keys(applyItem)[0];
			const applyToken = Object.keys(applyItem[applyKey])[0];
			const applyColumn = applyItem[applyKey][applyToken];
			Option.checkMixCourseRooms(applyColumn, tempBool);
			let groupKeys = Array.from( groupMapping.keys() );
			groupKeys.forEach(function (keyItem: string) {
				const applyResult: number = Option.aggregateGroup(applyToken, applyColumn, groupMapping.get(keyItem));
				let resultObj: any = {};
				resultObj[applyKey] = applyResult;
				let resultArrayToPush = resultMapping.get(keyItem);
				resultArrayToPush.push(resultObj);
				resultMapping.set(keyItem, resultArrayToPush);
			});

		});
		return [groupMapping, resultMapping];
	}

	private static checkMixCourseRooms(col: any, isCourseDataset: boolean) {
		const courseFields = ["dept" , "id" , "instructor", "title" ,"uuid", "avg" , "pass" , "fail", "audit" ,"year"];
		const roomFields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href",
			"furniture", "lat", "lon", "seats"];
		const colSplit = col.split("_");
		if (colSplit.length === 2) {
			if (isCourseDataset && roomFields.includes(colSplit[1])) {
				throw new InsightError("Invalid fields for courses dataset querying");
			}
			if (!isCourseDataset && courseFields.includes(colSplit[1])) {
				throw new InsightError("Invalid fields for room dataset querying");
			}
		}
	}

	private transformMapResult(mapList: any[]) {
		let groupMapping: Map<string, any[]> = mapList[0];
		let resultMapping: Map<string, any[]> = mapList[1];

		let aggregatedResults = [];
		for (let [key, value] of groupMapping.entries()) {
			let returnData: any = {};
			Object.assign(returnData, value[0]); // any value in group has attributes that can represent the group
			const aggResults: any = resultMapping.get(key);
			aggResults.forEach(function (ar: any) {
				returnData[Object.keys(ar)[0]] = Object.values(ar)[0];
			});
			aggregatedResults.push(returnData);
		}
		this.queryResult = aggregatedResults;
	}

	private static aggregateGroup(applyToken: string, applyColumn: string, group: any[]): number {
		let result = 0;
		let values: any = [];
		group.forEach(function (dataItem) {
			values.push(dataItem[applyColumn]);
		});
		if (applyToken === "AVG") {
			let total: Decimal = new Decimal(0);
			values.forEach(function (v: any) {
				total = Decimal.add(new Decimal(v), total);
			});
			let avg = total.toNumber() / values.length;
			result = Number(avg.toFixed(2));
		}
		if (applyToken === "SUM") {
			let total: Decimal = new Decimal(0);
			values.forEach(function (v: any) {
				total = Decimal.add(new Decimal(v), total);
			});
			result = Number(total.toFixed(2));
		}
		if (applyToken === "MAX") {
			let max = values[0];
			values.forEach(function (v: any) {
				if (v > max) {
					max = v;
				}
			});
			result = max;
		}
		if (applyToken === "MIN") {
			let min = values[0];
			values.forEach(function (v: any) {
				if (v < min) {
					min = v;
				}
			});
			result = min;
		}
		if (applyToken === "COUNT") {
			let resultSet = new Set();
			values.forEach(function (v: any) {
				resultSet.add(v);
			});
			result = resultSet.size;
		}
		return result;
	}
}
