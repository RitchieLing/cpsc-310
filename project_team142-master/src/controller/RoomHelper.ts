import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade";
import { CourseItem, CourseSection } from "../model/CourseSection";
import { parse, parseFragment, TypedTreeAdapter } from "parse5";

const http = require("http");
const JSZip = require("jszip");
const fs = require("fs-extra");
import * as querystring from "querystring";
import { log } from "util";
import { constants } from "os";
import FileReader from "./FileReader";
import httpRequest from "./HttpRequest";

const path = require("path");

interface BuildingData {
	code?: string,
	name?: string,
	address?: string,
	location?: {
		lat?: number,
		lon?: number
	}
	rooms: Room[];
}

export interface Room {
	fullname: string;
	shortname: string;
	number: string; //
	address: string;
	lat: number;
	lon: number;
	seats: number; //
	type: string; //
	furniture: string; //
	href: string; //
}

interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

interface RoomItem {
	[key: string]: Room[]
}

export default class RoomHelper {
	private zip = JSZip();
	public idList: string[] = [];
	public courseList: CourseSection[] = [];
	public InsideDataList: InsightDataset[] = [];
	public InsideMap = new Map();
	public RoomSectionMap = new Map();
	public RoomSections = {} as RoomItem;
	public tables: any[] = [];
	public buildings: BuildingData[] = [];
	public rooms: Room[] = [];
	public fr = new FileReader();

	public ZipExaminor(content: string): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this.zip.loadAsync(content, { base64: true, createFolders: true }).then((Data: any) => {
				return resolve(Data);
			}).catch(() => {
				return reject(new InsightError("invalid zip"));
			});
		});
	}


	public SetData(id: string, content: string, kind: InsightDatasetKind): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			return this.ZipExaminor(content).then(async (res: any) => {
				if (kind !== InsightDatasetKind.Rooms) {
					return reject(new InsightError("wrong data type"));
				}
				if (res.folder("/rooms/") === null) {
					return reject("no fold names rooms");
				}
				let name = Object.keys(res.files).find((filePath) => {
					return filePath.includes("index.htm") || "";
				});
				let campus = Object.keys(res.files).filter((filePath) => {
					return filePath.includes("/buildings-and-classrooms/");
				});
				let indexFile = res.files[name || ""];
				let file = await indexFile.async("text");
				if (file.length === 0) {
					return reject(new InsightError("empty zip file"));
				}
				let fragment = parse(file.toString());
				this.getTablesFromNodes(fragment, this.tables);
				for (let table of this.tables) {
					this.getTableContentFromTable(table);
				}
				await Promise.all(this.buildings.map((building) => this.roomDataProcess(res, campus, building)));
				let dataset: InsightDataset = {
					id,
					kind: InsightDatasetKind.Rooms,
					numRows: this.rooms.length
				};
				this.InsideDataList.push(dataset);
				this.InsideMap.set(id, dataset);
				this.RoomSections[id] = this.rooms;
				this.RoomSectionMap.set(id, this.rooms);
				this.writeDataSets();
				return resolve(id);
			})
				.catch((e) => reject(e));
		});
	}

	private async writeDataSets() {
		await this.fr.writeData("buildings", this.buildings);
		await this.fr.writeData("rooms", this.rooms);
	}

	private roomDataProcess(res: any, campus: string[], building: BuildingData) {
		let address = building.address || "";
		return new Promise((resolve, reject) => {
			this.requestLocation(address)
				.then((location: GeoResponse) => {
					this.fetchMoreData(res, campus, building, location)
						.then((data) => {
							return resolve(data);
						});
				});
		});
	}

	private accessCampusFile(res: any, campus: string[], code: string) {
		let htmlPath = campus.find((filePath) => filePath.includes(code)) || "";
		let fileObj = res.files[htmlPath];
		return new Promise((resolve, reject) => {
			fileObj.async("text").then((file: any) => {
				if (file.length === 0) {
					return reject(new InsightError("empty zip file"));
				}
				return resolve(file);
			});
		});
	}

	private fetchMoreData(res: any, campus: string[], buildingData: BuildingData, location: GeoResponse) {
		let tables: any[] = [];
		let rooms: Room[] = [];
		let code = buildingData.code || "";
		return this.accessCampusFile(res, campus, code)
			.then((file: any) => {
				let fragment = parse(file.toString());
				this.getTablesFromNodes(fragment, tables);
				for (let table of tables) {
					this.getRoomContentFromTable(table, rooms);
				}
				rooms.map((room: Room) => {
					room.fullname = buildingData.name || "";
					room.shortname = buildingData.code || "";
					room.address = buildingData.address || "";
					room.lat = location?.lat || 0;
					room.lon = location?.lon || 0;
					return room;
				});
				let index = this.buildings.findIndex((building) => building.code === buildingData.code);
				this.buildings[index].rooms = rooms;
				this.rooms = this.rooms.concat(rooms);
				return rooms;
			});
	}

	private getTablesFromNodes(fragment: any, list: any[]) {
		let nodes = fragment.childNodes;
		this.iterateNodes(nodes, "table", list);
	}

	private iterateNodes(nodes: any, nodeName: string, list: any[]) {
		for (let node of nodes) {
			if (node.nodeName === nodeName) {
				list.push(node);
				break;
			}
			if (node.childNodes) {
				nodes = node.childNodes;
				this.iterateNodes(nodes, nodeName, list);
			}
		}
	}

	private getRoomContentFromTable(fragment: any, list: Room[]) {
		let node = fragment.childNodes.find((n: any) => n.nodeName === "tbody");
		this.iterateRoomTrs(node.childNodes, list);
	}

	private getTableContentFromTable(fragment: any) {
		let node = fragment.childNodes.find((n: any) => n.nodeName === "tbody");
		this.iterateTrs(node.childNodes, this.buildings);
	}

	private iterateTrs(nodes: any, list: BuildingData[]) {
		for (let node of nodes) {
			if (node.nodeName === "tr") {
				this.iterateTds(node.childNodes, list);
			}
			if (node.childNodes) {
				this.iterateTrs(node.childNodes, list);
			}
		}
	}

	private iterateRoomTrs(nodes: any, list: Room[]) {
		for (let node of nodes) {
			if (node.nodeName === "tr") {
				this.iterateRoomTds(node.childNodes, list);
			}
			if (node.childNodes) {
				this.iterateRoomTrs(node.childNodes, list);
			}
		}
	}

	private iterateTds(nodes: any, list: BuildingData[]) {
		let building = {} as BuildingData;
		for (let node of nodes) {
			if (node.attrs && node.attrs.some((attr: any) => {
				return attr.name === "class" &&
					attr.value.includes("views-field-field-building-address");
			})) {
				let contentNode = node.childNodes.find((n: any) => n.nodeName === "#text");
				let content = contentNode.value;
				content = content.replace("\\n", "");
				content = content.trim();
				building.address = content;
			}
			if (node.attrs && node.attrs.some((attr: any) => attr.name === "class" &&
				attr.value.includes("views-field-field-building-code"))) {
				let contentNode = node.childNodes.find((n: any) => n.nodeName === "#text");
				let content = contentNode.value.trim();
				building.code = content;
			}
			if (node.attrs && node.attrs.some((attr: any) => attr.name === "class" &&
				attr.value.includes("views-field-title"))) {
				let aNode = node.childNodes.find((n: any) => n.nodeName === "a");
				let contentNode = aNode.childNodes.find((n: any) => n.nodeName === "#text");
				let content = contentNode.value;
				building.name = content;
			}
		}
		this.buildings.push(building);
	}

	private iterateRoomTds(nodes: any, list: Room[]) {
		let room = {} as Room;
		for (let node of nodes) {
			if (node.attrs && node.attrs.some((attr: any) => attr.name === "class" &&
				attr.value.includes("views-field-field-room-number"))) {
				let aNode = node.childNodes.find((n: any) => n.nodeName === "a");
				room.href = aNode.attrs.find((attr: any) => attr.name === "href").value;
				let contentNode = aNode.childNodes.find((n: any) => n.nodeName === "#text");
				room.number = contentNode.value;
			}
			if (node.attrs && node.attrs.some((attr: any) => attr.name === "class" &&
				attr.value.includes("views-field-field-room-capacity"))) {
				let contentNode = node.childNodes.find((n: any) => n.nodeName === "#text");
				room.seats = contentNode.value.trim();
			}
			if (node.attrs && node.attrs.some((attr: any) => attr.name === "class" &&
				attr.value.includes("views-field-field-room-furniture"))) {
				let contentNode = node.childNodes.find((n: any) => n.nodeName === "#text");
				room.furniture = contentNode.value.trim();
			}
			if (node.attrs && node.attrs.some((attr: any) => attr.name === "class" &&
				attr.value.includes("views-field-field-room-type"))) {
				let contentNode = node.childNodes.find((n: any) => n.nodeName === "#text");
				room.type = contentNode.value.trim();
			}
		}
		list.push(room);
	}

	public requestLocation(address: string) {
		return httpRequest(address)
			.then((data) => {
				let index = this.buildings.findIndex((building) => building.address === address);
				this.buildings[index].location = data;
				return data;
			});
	}

	public loadDataFromDisk(): Promise<any[]> {
		return Promise.all([
			this.fr.readData("buildings").then((obj) => this.buildings = obj),
			this.fr.readData("rooms").then((obj) => this.rooms = obj)
		]);
	}
}

