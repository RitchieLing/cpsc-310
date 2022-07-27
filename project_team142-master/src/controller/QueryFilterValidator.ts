import {InsightError} from "./IInsightFacade";

export default class QueryFilterValidator {
	private courseStrFields = ["dept" , "id" , "instructor", "title" ,"uuid"];
	private courseNumFields = ["avg" , "pass" , "fail", "audit" ,"year"];
	private roomStrFields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	private roomNumFields = ["lat", "lon", "seats"];

	private operators = ["IS", "AND", "OR", "NOT", "LT", "GT", "EQ"];
	private validDirs = ["UP", "DOWN"];
	private bool: boolean = true;

	// check filters for WHERE clauses recursively
	// logic filters have to have at least 2 elements in list, negation has to have exactly one
	// base case: mcomparison or scomparison
	public checkWhereFilters(queryObj: any, datasetIds: string[]): boolean  {
		for (let attr in queryObj) {
			if (queryObj[attr] === undefined || queryObj[attr] === null) {
				throw new InsightError(attr + "filter is empty");
			}
			if (attr === "AND" || attr === "OR") {
				const arrObj = queryObj[attr];
				if (!Array.isArray(arrObj)) {
					throw new InsightError("AND/OR keys have to be in an array.");
				} else {
					if (arrObj.length < 2) {
						throw new InsightError("AND/OR keys should have at least 2 values for comparison.");
					}
					if (this.checkAndOrEmptyKeys(arrObj)) {
						for (let obj of arrObj) {
							this.bool = this.bool && this.checkWhereFilters(obj, datasetIds);
						}
					}
				}
			}
			if (attr === "NOT") {
				const notObj = queryObj["NOT"];
				if (typeof notObj !== "object") {
					throw new InsightError("NOT has to be an object");
				} else {
					this.bool = this.bool && this.checkWhereFilters(notObj, datasetIds);
				}
			}
			if (attr === "IS") {
				if (typeof queryObj[attr] !== "object") {
					throw new InsightError("IS has to be an object");
				}
				return this.checkStrComparator(queryObj[attr], datasetIds);
			}
			if (attr === "LT" || attr === "GT" || attr === "EQ") {
				if (typeof queryObj[attr] !== "object") {
					throw new InsightError("LT/GT/EQ has to be an object");
				}
				return this.checkNumComparator(queryObj[attr], datasetIds);
			}
			if (!this.operators.includes(attr)) {
				throw new InsightError("Query is missing logic operator. ");
			}
		}
		return true;
	}

	public checkOptionsFilters(optionObj: any, datasetIds: string[], hasTransformations: boolean): boolean {
		let optionColumns: string[] = [];
		if (!Object.prototype.hasOwnProperty.call(optionObj, "COLUMNS")) {
			throw new InsightError("OPTIONS does not have COLUMNS. ");
		}
		const columnObj = optionObj["COLUMNS"];
		if (columnObj === undefined || columnObj === null) {
			throw new InsightError("COLUMNS cannot be empty. ");
		}
		if (!Array.isArray(columnObj) || columnObj.length === 0) {
			throw new InsightError("COLUMNS has to be a non-empty array. ");
		} else {
			optionColumns = this.checkValidColumnKeys(columnObj, datasetIds, hasTransformations);
		}

		if (Object.prototype.hasOwnProperty.call(optionObj, "ORDER")) {
			const orderObj = optionObj["ORDER"];
			if (orderObj === undefined || orderObj === null) {
				throw new InsightError("ORDER key cannot be empty. ");
			}
			if (typeof orderObj === "string") {
				if (!optionColumns.includes(orderObj)) {
					throw new InsightError("ORDER key has to be in columns. ");
				}
			} else {
				if (typeof orderObj === "object") {
					this.checkOrderObj(orderObj, optionColumns);
				} else {
					throw new InsightError("ORDER key(s) must be string or object");
				}
			}
		}
		return true;
	}

	private checkStrComparator(isObj: any, datasetIds: string[]): boolean {
		const sKeyArray = Object.keys(isObj);
		if (sKeyArray.length !== 1) {
			throw new InsightError("IS should have 1 key, but found" + sKeyArray.length);
		}
		const sKey = sKeyArray[0];
		if (typeof isObj[sKey] !== "string") {
			throw new InsightError("IS should have string value. ");
		}
		if (!sKey.includes("_")) {
			throw new InsightError("IS key should have '_' as delimiter. ");
		}
		const sKeySplit =  sKey.split("_");
		if (sKeySplit.length !== 2) {
			throw new InsightError("invalid key " + sKey);
		}
		const sField = sKeySplit[1];
		if (!this.courseStrFields.includes(sField) && !this.roomStrFields.includes(sField)) {
			throw new InsightError("invalid string field in IS");
		}
		datasetIds.push(sKeySplit[0]);
		// checks if wildcards are in the middle
		if (!this.checkWildcards(isObj[sKey])) {
			throw new InsightError("Only one asterisk can be at the front or at the end of the string (or both)");
		}
		return true;
	}

	// returns true if only one asterisk is at the front or at the end of the string (or both), false otherwise
	private checkWildcards(str: string): boolean {
		const re = new RegExp("^\\*?[^*]*\\*?$");
		// console.log("wildcard input " + str + " result " + re.test("cps*c"));
		return re.test(str);
	}

	private checkNumComparator(numObj: any, datasetIds: string[]): boolean {
		const mKeyArray = Object.keys(numObj);
		if (mKeyArray.length !== 1) {
			throw new InsightError("GT/LT/EQ should have 1 key, but found" + mKeyArray.length);
		}
		const mKey = mKeyArray[0];
		if (typeof numObj[mKey] !== "number") {
			throw new InsightError("GT/LT/EQ should have number value. ");
		}
		if (!mKey.includes("_")) {
			throw new InsightError("GT/LT/EQ key should have '_' as delimiter. ");
		}
		const mKeySplit =  mKey.split("_");
		if (mKeySplit.length !== 2) {
			throw new InsightError("invalid key " + mKey);
		}
		const mField = mKeySplit[1];
		if (!this.courseNumFields.includes(mField) && !this.roomNumFields.includes(mField)) {
			throw new InsightError("invalid m field in GT/LT/EQ key");
		}
		datasetIds.push(mKeySplit[0]);
		// console.log("id pushed in mKey: " + mKeySplit[0]);
		return true;
	}

	// assume COLUMNS is not empty
	// checks if keys in COLUMNS are valid (using format 'datasetId_field')
	// returns column key list
	private checkValidColumnKeys(columnArray: any, datasetIds: string[], hasTransformations: boolean): string[] {
		let result: string[] = [];
		for (let col of columnArray) {
			if (typeof col !== "string") {
				throw new InsightError("Column keys must be strings");
			}
			if (col.includes("_")) {
				const colSplit = col.split("_");
				if (colSplit.length !== 2) {
					throw new InsightError("invalid COLUMNS key " + col);
				}
				const field = colSplit[1];
				if (!this.courseNumFields.includes(field) && !this.courseStrFields.includes(field) &&
				!this.roomNumFields.includes(field) && !this.roomStrFields.includes(field)) {
					throw new InsightError("invalid key " + col + "in COLUMNS");
				}
				datasetIds.push(colSplit[0]);
			} else {
				if (!hasTransformations) {
					throw new InsightError("Invalid Column Keys");
				}
			}
			result.push(col);
			// console.log("id pushed in columns: " + colSplit[0]);
		}
		return result;
	}

	private checkAndOrEmptyKeys(arrObj: any[]): boolean {
		let count = 0;
		for (let obj of arrObj) {
			if (Object.keys(obj).length === 1) {
				count += 1;
			}
		}
		if (count < arrObj.length) {
			throw new InsightError("AND/OR keys should have non-empty values. ");
		}
		return true;
	}

	public checkFilters(queryObj: any): string[] {
		let datasetIds: string[] = [];
		let hasTransformations = false;
		if (queryObj["TRANSFORMATIONS"] !== undefined) {
			hasTransformations = true;
		}
		this.checkOptionsFilters(queryObj["OPTIONS"], datasetIds, hasTransformations);
		this.checkWhereFilters(queryObj["WHERE"], datasetIds);
		return datasetIds;
	}

	// returns true if ORDER object in query passes EBNF, false otherwise
	private checkOrderObj(orderObj: any, columns: string[]) {
		const objKeys = Object.keys(orderObj);
		if (objKeys.length !== 2) {
			throw new InsightError("ORDER must only have two keys: dir and keys");
		}
		if (!objKeys.includes("dir") || !objKeys.includes("keys")) {
			throw new InsightError("ORDER must have both keys: dir and keys");
		}
		const sortKeys = orderObj["keys"];
		if (!Array.isArray(sortKeys) || sortKeys.length === 0) {
			throw new InsightError("ORDER keys must be an non-empty array");
		}
		for (let k of sortKeys) {
			if (!columns.includes(k)) {
				throw new InsightError("ORDER keys must be included in COLUMN keys");
			}
		}
		const dirValue = orderObj["dir"];
		if (!this.validDirs.includes(dirValue)) {
			throw new InsightError("ORDER dir keys must be either UP or DOWN");
		}
	}
}
