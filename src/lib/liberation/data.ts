/** Genesis / Destiny liberation data from MapleHub liberation calculator. */

export type LiberationType = "genesis" | "destiny";

export type TraceDifficulty = { label: string; baseTraces: number };
export type TraceBoss = { name: string; difficulties: TraceDifficulty[] };

export type LiberationMilestone = {
  label: string;
  bossName: string;
  requiredTraces: number;
};

export const TRACE_BANK_CAP = 3000;
export const GENESIS_TARGET = 6500;
export const DESTINY_TARGET = 7500;

/** Weekly/monthly bosses that grant Traces of Darkness (solo share before party split). */
export const TRACE_BOSSES: TraceBoss[] = 
[
  {
    "name": "Lotus",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 10
      },
      {
        "label": "Hard",
        "baseTraces": 50
      },
      {
        "label": "Extreme",
        "baseTraces": 50
      }
    ]
  },
  {
    "name": "Damien",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 10
      },
      {
        "label": "Hard",
        "baseTraces": 50
      }
    ]
  },
  {
    "name": "Lucid",
    "difficulties": [
      {
        "label": "Easy",
        "baseTraces": 15
      },
      {
        "label": "Normal",
        "baseTraces": 20
      },
      {
        "label": "Hard",
        "baseTraces": 65
      }
    ]
  },
  {
    "name": "Will",
    "difficulties": [
      {
        "label": "Easy",
        "baseTraces": 15
      },
      {
        "label": "Normal",
        "baseTraces": 25
      },
      {
        "label": "Hard",
        "baseTraces": 75
      }
    ]
  },
  {
    "name": "Gloom",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 20
      },
      {
        "label": "Chaos",
        "baseTraces": 65
      }
    ]
  },
  {
    "name": "Darknell",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 25
      },
      {
        "label": "Hard",
        "baseTraces": 75
      }
    ]
  },
  {
    "name": "Verus Hilla",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 45
      },
      {
        "label": "Hard",
        "baseTraces": 90
      }
    ]
  },
  {
    "name": "Black Mage",
    "difficulties": [
      {
        "label": "Hard",
        "baseTraces": 600
      },
      {
        "label": "Extreme",
        "baseTraces": 600
      }
    ]
  },
  {
    "name": "Seren",
    "difficulties": [
      {
        "label": "Hard",
        "baseTraces": 6
      },
      {
        "label": "Extreme",
        "baseTraces": 80
      }
    ]
  },
  {
    "name": "Kalos",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 10
      },
      {
        "label": "Chaos",
        "baseTraces": 70
      },
      {
        "label": "Extreme",
        "baseTraces": 400
      }
    ]
  },
  {
    "name": "Adversary",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 15
      },
      {
        "label": "Hard",
        "baseTraces": 120
      },
      {
        "label": "Extreme",
        "baseTraces": 500
      }
    ]
  },
  {
    "name": "Malefic Star",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 20
      },
      {
        "label": "Hard",
        "baseTraces": 380
      }
    ]
  },
  {
    "name": "Kaling",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 20
      },
      {
        "label": "Hard",
        "baseTraces": 160
      },
      {
        "label": "Extreme",
        "baseTraces": 1200
      }
    ]
  },
  {
    "name": "Limbo",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 120
      },
      {
        "label": "Hard",
        "baseTraces": 360
      }
    ]
  },
  {
    "name": "Baldrix",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 150
      },
      {
        "label": "Hard",
        "baseTraces": 450
      }
    ]
  },
  {
    "name": "Jupiter",
    "difficulties": [
      {
        "label": "Normal",
        "baseTraces": 160
      },
      {
        "label": "Hard",
        "baseTraces": 500
      }
    ]
  }
];

export const GENESIS_MILESTONES: LiberationMilestone[] = [
  { label: "Von Leon — 0", bossName: "Von Leon", requiredTraces: 0 },
  { label: "Arkarium — 500", bossName: "Arkarium", requiredTraces: 500 },
  { label: "Magnus — 1,000", bossName: "Magnus", requiredTraces: 1000 },
  { label: "Lotus — 1,500", bossName: "Lotus", requiredTraces: 1500 },
  { label: "Damien — 2,500", bossName: "Damien", requiredTraces: 2500 },
  { label: "Will — 3,500", bossName: "Will", requiredTraces: 3500 },
  { label: "Lucid — 4,500", bossName: "Lucid", requiredTraces: 4500 },
  { label: "Verus Hilla — 5,500", bossName: "Verus Hilla", requiredTraces: 5500 },
];

export const DESTINY_MILESTONES: LiberationMilestone[] = [
  { label: "Seren — 0", bossName: "Seren", requiredTraces: 0 },
  { label: "Kalos — 2,000", bossName: "Kalos", requiredTraces: 2000 },
  { label: "Kaling — 4,500", bossName: "Kaling", requiredTraces: 4500 },
];

