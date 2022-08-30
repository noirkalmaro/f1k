import { Lap } from '../entities/lap';
import { CompetitorStates } from './competitor-state.interface';
import { RaceParams } from './race-params.interface';
import { TeamChange, TeamChanges } from './team-changes.interface';

export interface ProcessingService {
	changeTeamDrivers(teamChangesSet: { [key: number]: TeamChange }, lap: Lap, isPitInLap: boolean): void,
	updateLaps(dataView: DataView /* t */, competitorStates: CompetitorStates, teamChanges: TeamChanges): {
		competitorStates: CompetitorStates,
		teamChanges: TeamChanges
	}
	updateSessions(
		sessionsUpdates: { [key: string]: { [key: string]: number } },
		competitorStates: CompetitorStates,
		raceParams: RaceParams
	): CompetitorStates;
	updatePitlanes(
		pitlaneUpdates: { [key: string]: { [key: string]: number } },
		competitorStates: CompetitorStates,
		raceParams: RaceParams
	): CompetitorStates;
	updateIntervals(intervalUpdates: any, teamIntervals: any): any,
	updateTeams(teamUpdates: any, raceTeams: any): void,
	updateChanges(
		changesUpdate: any,
		competitorStates: CompetitorStates,
		teamChanges: TeamChanges,
		raceDrivers: any,
		raceParams: RaceParams,
		pilotChangesTable: any
	): void,
	updateDrivers(
		driversUpdate: any,
		competitorStates: CompetitorStates,
		raceDrivers: any,
		teamChanges: TeamChanges
	): any,
}
