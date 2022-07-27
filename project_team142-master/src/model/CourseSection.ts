
export interface CourseSection {
	dept: string;
	id: string;
	avg: number;
	instructor: string;
	title: string;
	pass: number;
	fail: number;
	audit: number;
	uuid: string;
	year: number;
}

export interface CourseItem {
	[key: string]: CourseSection[]
}
