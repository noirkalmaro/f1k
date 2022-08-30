import { Lap } from '../entities/lap'
import { DATA_CODES } from '../enums/data-code.enum'

export interface CompetitorState {
	lapsdata: Lap[],
	doLoad: boolean,
	_session_time: {
		pitState: boolean,
		formatLapTime: string,
		fail: boolean,
	},
	_current_lap_time: string,
	[DATA_CODES.COMPETITOR_STATE]?: number,
	_pit_time: {
		formatLapTime: string,
		fail: boolean,
	}
	[DATA_CODES.PIT_TIME]?: number,
}

export interface CompetitorStates {
	[key: string]: CompetitorState
}
