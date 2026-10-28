# Usability test plan

The proposal commits to usability testing of the planning console. This plan is
ready to run; the results table at the end stays empty until real sessions are
held. Do not fill it with estimated or invented scores.

## Participants

- 5–8 people who would plan or review a campus WLAN: ICT/network staff, and
  students or staff familiar with the buildings.
- Record only a participant code (P1, P2, …) and role. No names.

## Setup

- Full stack running (see the repository README), browser at the GUI URL.
- One building's floor plan image, and its wall layout JSON if it has been
  digitised.
- A screen recorder or an observer taking notes; a timer.

## Tasks

Read each task aloud. Do not demonstrate. Note time taken, errors and whether
help was needed.

| # | Task | Success when |
| --- | --- | --- |
| 1 | Set up a 25 × 20 cell venue with 2 floors and 200 users. | Values set and analysis runs |
| 2 | Load the floor-plan image and draw the main walls of floor 1. | Wall count > 0 and walls line up with the plan |
| 3 | Run the analysis and report the coverage and average SINR. | Correct values read from the metrics |
| 4 | Find which access point serves the most users and its channel. | Correct AP and channel from the AP table |
| 5 | Switch to crowd hotspots, re-run, and say how many users the simulated rebalancing moved. | Correct number from Recommendations |
| 6 | Import the sample telemetry CSV and run a telemetry analysis. | Run #N shown as imported telemetry |
| 7 | Export the venue layout for reuse. | JSON file downloaded |

## System Usability Scale (SUS)

After the tasks, each participant rates 1 (strongly disagree) to 5 (strongly
agree):

1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

Scoring: for odd items subtract 1 from the score; for even items subtract the
score from 5. Sum the ten values and multiply by 2.5 (range 0–100). 68 is the
commonly cited average.

## Results

| Participant | Role | Tasks completed (of 7) | Total time (min) | SUS score | Main issues observed |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Summarise the mean SUS score, task success rate and the three most common
problems in the project report once the sessions are done.
