type LegacyEntry = {
    sourceId: string;
    project: string | null;
    channel: string;
    aliases: string[];
};
type Counts = {
    website: number;
    legacy: number;
    merged: number;
};
export declare function backfillResources(project: string, channel: string, legacy: LegacyEntry[], apply?: boolean, siteAliases?: string[]): Promise<Counts>;
export {};
