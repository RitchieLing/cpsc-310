import {InsightError} from "./IInsightFacade";

export default class QueryTransformationsHelper {
	private validApplyTokens = ["MAX", "MIN", "AVG", "SUM", "COUNT"];
	private validNumApplyTokens = ["MAX", "MIN", "AVG", "SUM"];

	private courseNumFields = ["avg" , "pass" , "fail", "audit" ,"year"];
	private roomNumFields = ["lat", "lon", "seats"];

	// checks EBNF of TRANSFORMATIONS and returns a list of keys used in GROUP and APPLY
	public getTransKeys(transObj: any): string[] {
		const groupObj = transObj["GROUP"];
		const applyObj = transObj["APPLY"];
		let result: string[] = [];
		for (let groupId of groupObj) {
			result.push(groupId);
		}
		for (let applyAttr of applyObj) {
			const applyKey = Object.keys(applyAttr)[0];
			result.push(applyKey);
		}
		return result;
	}

	// checks EBNF for TRANSFORMATION and pushes keys excluding apply key to datasetIds
	public checkTransformation(transObj: any, datasetIds: string[]) {
		const groupObj = transObj["GROUP"];
		const applyObj = transObj["APPLY"];
		if (groupObj === undefined) {
			throw new InsightError("GROUP is missing in TRANSFORMATIONS");
		}
		if (applyObj === undefined) {
			throw new InsightError("APPLY is missing in TRANSFORMATIONS");
		}
		this.checkGroup(groupObj, datasetIds);

		if (!Array.isArray(applyObj)) {
			throw new InsightError("APPLY should be an array. ");
		}
		this.checkApply(applyObj, datasetIds);
	}

	private checkApply(applyObj: any, datasetIds: string[]) {
		const applyKeys = new Set();
		for (let applyAttr of applyObj) {
			if (Array.isArray(applyAttr)) {
				throw new InsightError("Invalid apply rule, should be object. ");
			}
			if (Object.keys(applyAttr).length !== 1) {
				throw new InsightError("There should be only 1 apply key per apply object. ");
			}
			const ak = Object.keys(applyAttr)[0];
			if (ak.includes("_")) {
				throw new InsightError("APPLY key should not have underscore.");
			}
			if (Object.keys(applyAttr[ak]).length !== 1) {
				throw new InsightError("There should be only 1 apply token per apply key. ");
			}
			const applyToken = Object.keys(applyAttr[ak])[0];
			if (!this.validApplyTokens.includes(applyToken)) {
				throw new InsightError("Invalid apply token " + applyToken);
			}
			if (applyKeys.size === applyKeys.add(ak).size) {
				throw new InsightError("APPLY keys should be unique");
			}
			if (this.validNumApplyTokens.includes(applyToken)) {
				const applyTargetKey = applyAttr[ak][applyToken];
				if (typeof applyTargetKey !== "string") {
					throw new InsightError("Apply target key should be string! ");
				}
				if (applyTargetKey.split("_").length !== 2) {
					throw new InsightError("invalid COLUMNS key " + applyAttr[ak][applyToken]);
				}
				if (this.validNumApplyTokens.includes(applyToken)) {
					if (!this.courseNumFields.includes(applyTargetKey.split("_")[1])
						&& !this.roomNumFields.includes(applyTargetKey.split("_")[1])) {
						throw new InsightError("Apply token " + applyToken + "only for numeric fields. ");
					}
				}
			}
			datasetIds.push(applyAttr[ak][applyToken].split("_")[0]);
		}
	}

	private checkGroup(groupObj: any, datasetIds: string[]) {
		if (!Array.isArray(groupObj) || groupObj.length === 0) {
			throw new InsightError("GROUP should be a non-empty array.");
		}
		for (let groupId of groupObj) {
			if (typeof groupId !== "string") {
				throw new InsightError("GROUP elements should be strings.");
			}
			if (groupId.split("_").length !== 2) {
				throw new InsightError("Invalid keys in GROUP");
			}
			datasetIds.push(groupId.split("_")[0]);
		}
	}
}
