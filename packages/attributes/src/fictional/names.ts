/**
 * MADE-UP NAMES (ADR-079 Q6). Common first names and common surnames, combined by the seed.
 *
 * Nothing here is a real roster. A random pairing of two common names can match somebody real
 * by chance, as any fictional league's will; the lists avoid distinctive surnames for that
 * reason. Real players arrive later, and only through the real importer (attributes.md §5).
 */
import type { Rng } from "@ff/contracts";

export const FIRST_NAMES: readonly string[] = [
  "Aaron", "Adam", "Adrian", "Alex", "Andre", "Andrew", "Anthony", "Austin", "Avery", "Ben",
  "Blake", "Bobby", "Brandon", "Brent", "Brian", "Bryce", "Caleb", "Calvin", "Cameron", "Carl",
  "Carter", "Casey", "Chase", "Chris", "Clay", "Cody", "Colin", "Connor", "Corey", "Curtis",
  "Dale", "Damon", "Daniel", "Darius", "Darnell", "Darren", "David", "Dean", "Derek", "Devin",
  "Dominic", "Donovan", "Drew", "Dylan", "Eddie", "Eli", "Elijah", "Eric", "Ethan", "Evan",
  "Felix", "Frank", "Gabe", "Garrett", "Gavin", "Grant", "Greg", "Hank", "Hayden", "Hunter",
  "Isaac", "Isaiah", "Ivan", "Jace", "Jack", "Jalen", "Jamal", "James", "Jared", "Jason",
  "Javon", "Jeff", "Jerome", "Jesse", "Joel", "Jordan", "Joseph", "Julian", "Justin", "Kade",
  "Keith", "Kendall", "Kevin", "Kyle", "Lamar", "Lance", "Landon", "Leon", "Levi", "Logan",
  "Lucas", "Luke", "Malik", "Marcus", "Mario", "Mark", "Marvin", "Mason", "Max", "Micah",
  "Miles", "Mitchell", "Nate", "Neil", "Nick", "Noah", "Omar", "Owen", "Parker", "Paul",
  "Peyton", "Quentin", "Reggie", "Riley", "Robert", "Rodney", "Ross", "Ryan", "Sam", "Scott",
  "Sean", "Seth", "Shane", "Spencer", "Terrell", "Terry", "Theo", "Tim", "Travis", "Trent",
  "Trevor", "Tristan", "Troy", "Tyler", "Tyrone", "Victor", "Wade", "Wes", "Xavier", "Zach",
];

export const LAST_NAMES: readonly string[] = [
  "Abbott", "Acosta", "Adkins", "Alston", "Ashby", "Atwood", "Avery", "Bailey", "Baldwin", "Banks",
  "Barlow", "Barrett", "Baxter", "Beasley", "Bennett", "Bishop", "Blair", "Boone", "Bowen", "Boyd",
  "Bradley", "Bragg", "Brennan", "Briggs", "Brock", "Bryant", "Burke", "Burton", "Calloway", "Carver",
  "Chandler", "Chapman", "Clayton", "Cobb", "Coleman", "Conley", "Cooley", "Crawford", "Crosby", "Dalton",
  "Daniels", "Dawson", "Deacon", "Delaney", "Dixon", "Dorsey", "Doyle", "Drake", "Dudley", "Duncan",
  "Easley", "Ellison", "Emerson", "Farley", "Fenton", "Fields", "Fleming", "Fowler", "Franklin", "Frazier",
  "Gaines", "Garner", "Gibbs", "Gilmore", "Goodwin", "Graves", "Greer", "Griffin", "Hale", "Hamlin",
  "Hampton", "Harmon", "Hartley", "Hawkins", "Hayes", "Heath", "Hendrix", "Hobbs", "Holloway", "Hooper",
  "Horton", "Houston", "Hughes", "Ingram", "Jennings", "Keller", "Kemp", "Kendrick", "Kirby", "Knox",
  "Lambert", "Langley", "Lawson", "Leland", "Lindsey", "Lowery", "Lyons", "Maddox", "Malone", "Mann",
  "Marsh", "Maxwell", "McBride", "McCall", "McKenzie", "Mercer", "Merritt", "Monroe", "Morrow", "Moss",
  "Nash", "Newell", "Nolan", "Norris", "Oakley", "Odom", "Osborne", "Pace", "Parrish", "Patton",
  "Pearson", "Pittman", "Pope", "Porter", "Preston", "Pryor", "Quinn", "Ramos", "Randle", "Reese",
  "Rhodes", "Rios", "Roach", "Rollins", "Rowe", "Rucker", "Sanders", "Sawyer", "Sellers", "Shaw",
  "Shelton", "Simmons", "Slater", "Sparks", "Spencer", "Stratton", "Stanton", "Stokes", "Strickland", "Sutton",
  "Talley", "Tanner", "Tate", "Thornton", "Tillman", "Townsend", "Tucker", "Turner", "Underwood", "Vance",
  "Vaughn", "Wade", "Walsh", "Warren", "Watkins", "Weaver", "Webster", "Whitaker", "Whitfield", "Wilder",
  "Wiley", "Winston", "Wolfe", "Woodard", "Wyatt", "Yates", "York", "Young", "Zeller", "Zimmerman",
];

/** A full name not yet used in this league; re-draws on a clash. */
export function drawName(rng: Rng, used: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  throw new Error("drawName: could not find an unused name in 50 draws");
}
