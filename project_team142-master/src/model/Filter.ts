import {CourseSection} from "./CourseSection";
import {InsightError} from "../controller/IInsightFacade";

export default class Filter {
	private whereBool: boolean;
	private section: any;
	private isCourseDataset: boolean;

	private courseStrFields = ["dept" , "id" , "instructor", "title" ,"uuid"];
	private courseNumFields = ["avg" , "pass" , "fail", "audit" ,"year"];
	private roomStrFields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	private roomNumFields = ["lat", "lon", "seats"];

	constructor(isCourses: boolean) {
		this.whereBool = true;
		this.isCourseDataset = isCourses;
	}

	public performWhereFilter(section: any, queryObj: any): boolean {
		// store anything needed into class
		this.section = section;
		// checks if section meets conditions in query
		return this.isCondSatisfied(queryObj["WHERE"]);
	}

	private isCondSatisfied(whereObj: any): boolean {
		this.whereBool = true;
		for (let attr of Object.keys(whereObj)) {
			// base cases LT, GT, EQ, IS
			if (attr === "IS") {
				const isObj = whereObj[attr];
				return this.checkStrComparator(isObj);
			}
			if (attr === "LT" || attr === "GT" || attr === "EQ") {
				const numObj = whereObj[attr];
				return this.checkNumComparator(numObj, attr);
			}
			// recursive calls
			if (attr === "AND") {
				const andObj = whereObj["AND"];
				for (let andAttr of andObj) {
					this.whereBool = this.whereBool && this.isCondSatisfied(andAttr);
				}
			}
			if (attr === "OR") {
				const orObj = whereObj["OR"];
				this.whereBool = false; // or will always return true if not initialize to false
				for (let orAttr of orObj) {
					this.whereBool = this.whereBool || this.isCondSatisfied(orAttr);
				}
			}
			if (attr === "NOT") {
				const notObj = whereObj["NOT"];
				return !this.isCondSatisfied(notObj);
			}
		}
		return this.whereBool;
	}

	private checkStrComparator(isObj: any): boolean {
		const sKey = Object.keys(isObj)[0];
		const sField = sKey.split("_")[1];
		if (this.isCourseDataset && this.roomStrFields.includes(sField)) {
			throw new InsightError("Invalid fields for courses dataset querying");
		}
		if (!this.isCourseDataset && this.courseStrFields.includes(sField)) {
			throw new InsightError("Invalid fields for room dataset querying");
		}
		const sectionValue = this.section[sField];
		const queryValue = isObj[sKey];
		// console.log("checking IS, query value = " + isObj[sKey]);
		// console.log("checking IS, section value = " + sectionValue);
		// console.log("checking IS compare, " + (isObj[sKey] === sectionValue));
		if (queryValue.includes("*")) {
			const wildCardExp = "^" + queryValue.replace(/\*/g, ".*") + "$";
			const re = new RegExp(wildCardExp);
			return re.test(sectionValue);
		}
		return queryValue === sectionValue;
	}

	private checkNumComparator(numObj: any, attr: string): boolean {
		const mKey = Object.keys(numObj)[0];
		const mField = mKey.split("_")[1];
		if (this.isCourseDataset && this.roomNumFields.includes(mField)) {
			throw new InsightError("Invalid fields for courses dataset querying");
		}
		if (!this.isCourseDataset && this.courseNumFields.includes(mField)) {
			throw new InsightError("Invalid fields for room dataset querying");
		}
		const sectionValue = this.section[mField];
		const queryValue = numObj[mKey];
		if (attr === "LT") {
			return sectionValue < queryValue;
		}
		if (attr === "GT") {
			// console.log("checking GT, section keys = " + Object.keys(this.section));
			// console.log("checking GT, sectionValue = " + sectionValue + " query value = " + queryValue);
			// if (sectionValue > queryValue) {
			// 	console.log("GT check passed. sectionValue = " + sectionValue + " query value = " + queryValue);
			// }
			return sectionValue > queryValue;
		}
		if (attr === "EQ") {
			return sectionValue === queryValue;
		}
		return false;
	}

}
