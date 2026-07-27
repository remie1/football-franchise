/** Branded identifiers. IDs are opaque — no domain may parse meaning out of an ID string. */
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type PlayerId = Brand<string, "PlayerId">;
export type TeamId = Brand<string, "TeamId">;
export type GameId = Brand<string, "GameId">;
export type PlayId = Brand<string, "PlayId">;
export type SeasonId = Brand<string, "SeasonId">;
export type StorylineId = Brand<string, "StorylineId">;
export type StaffId = Brand<string, "StaffId">;
export type AttrId = Brand<string, "AttrId">;
export type CoachAttrId = Brand<string, "CoachAttrId">;
export type TraitId = Brand<string, "TraitId">;
export type SceneId = Brand<string, "SceneId">;
export type AssetId = Brand<string, "AssetId">;

export const playerId = (s: string) => s as PlayerId;
export const teamId = (s: string) => s as TeamId;
export const gameId = (s: string) => s as GameId;
export const playId = (s: string) => s as PlayId;
export const staffId = (s: string) => s as StaffId;
export const attrId = (s: string) => s as AttrId;
export const coachAttrId = (s: string) => s as CoachAttrId;
export const traitId = (s: string) => s as TraitId;
export const storylineId = (s: string) => s as StorylineId;

export type Position =
  | "QB" | "RB" | "FB" | "WR" | "TE"
  | "LT" | "LG" | "C" | "RG" | "RT"
  | "DE" | "DT" | "NT" | "OLB" | "MLB" | "ILB"
  | "CB" | "FS" | "SS" | "K" | "P" | "LS";

export type PositionGroup =
  | "QB" | "RB" | "FB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "ST";

export const POSITION_GROUP: Record<Position, PositionGroup> = {
  QB: "QB", RB: "RB", FB: "FB", WR: "WR", TE: "TE",
  LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL",
  DE: "DL", DT: "DL", NT: "DL",
  OLB: "LB", MLB: "LB", ILB: "LB",
  CB: "DB", FS: "DB", SS: "DB",
  K: "ST", P: "ST", LS: "ST",
};
