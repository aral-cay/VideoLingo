# VideoLingo Trial Analysis Results

**Analysis Date:** November 25, 2025
**Study Design:** Failed crossover design (participants only used one condition each)

---

## 📖 START HERE

**If you want the complete story:** Read **`FINAL_ANALYSIS.md`** (comprehensive 10-section report)

**If you want a quick overview:** Read **`QUICK_SUMMARY.md`** (2-page summary)

**If you're writing a paper:** Use **`RESULTS_SECTION.md`** (publication-ready results section)

**If you want to understand engagement metrics:** Read **`ENGAGEMENT_FINDINGS.md`**

**If you want to know what metrics are available:** Read `../METRICS_INVENTORY.md`

---

## 📊 Data Files in This Directory

### 1. `participant_condition_metrics.csv`
**Individual participant data by condition used**

Contains one row per participant with their actual condition usage:
- 4 participants (Purplestar, Pajamas, BadBunny used experimental; Joji used control)
- Metrics: sessions, videos completed, quiz accuracy, XP, hearts, etc.
- Uses the condition from activity data (sessions/video_runs), NOT from participants table

**Key Finding:** All 3 experimental participants were highly engaged; the 1 control participant had minimal engagement.

---

### 2. `participant_condition_order.csv`
**Documents which conditions participants used and in what order**

Shows:
- **4 participants** used only ONE condition (never switched)
- **2 participants** had zero activity
- **0 participants** completed the crossover (used both conditions)

**Key Finding:** The crossover design failed - participants dropped out after being switched to their second condition.

---

### 3. `condition_aggregates_crossover.csv`
**Comparison of Experimental vs Control conditions**

Properly calculated using actual condition from activity data:

| Condition | N | Mean Sessions | Mean Videos Completed | Mean Quiz Accuracy |
|-----------|---|---------------|----------------------|-------------------|
| Experimental | 3 | 19.33 | 3.33 | 85.83% |
| Control | 1 | 5.00 | 1.00 | 10.00% |

**Key Finding:** Experimental (gamified) condition performed MUCH better than control.

**BUT IMPORTANT CAVEATS:**
- Extremely small sample (n=3 vs n=1)
- Possible selection bias (experimental participants may have been more motivated)
- Confounded with cohort (all experimental = Cohort A, control = Cohort B)
- Not statistically valid due to sample size

---

### 4. `within_subjects_comparison.csv`
**Same person: experimental vs control comparison**

**This file is empty** because NO participants used both conditions.

This proves the crossover design failed completely - participants only engaged with their first assigned condition, then dropped out when switched.

---

## What Happened in This Study?

### Study Design (Intended)
- Crossover design where participants would experience both conditions
- This allows within-subjects comparison (same person in both conditions)

### What Actually Happened
1. **Phase 1:** Participants assigned to initial conditions
   - Purplestar, Pajamas, BadBunny → Experimental (gamified)
   - Joji → Control (no gamification)

2. **Phase 2:** Participants were switched to opposite conditions
   - The 3 experimental participants → Switched to control (but never engaged)
   - Joji → Switched to experimental (but never engaged)

3. **Result:** Everyone dropped out after the switch
   - Nobody completed activities in their second assigned condition
   - Crossover design completely failed

### Why the Participants Table Was Misleading

The `participants` table shows the **FINAL/CURRENT** condition assignment:
- Purplestar, Pajamas, BadBunny show as "control" (their 2nd condition)
- Joji shows as "experimental" (his 2nd condition)

But their **actual activity** was all in their FIRST condition:
- Purplestar, Pajamas, BadBunny did everything in "experimental"
- Joji did everything in "control"

This is why the first analysis (using participants.condition) was completely backwards!

---

## Key Findings

### 1. Gamification Effectiveness
**Gamified condition performed much better:**
- 85.83% quiz accuracy vs 10% in control
- 3.33 videos completed vs 1 in control
- 19.33 sessions vs 5 in control

### 2. Major Limitations
- **Tiny sample:** n=3 vs n=1 (not statistically valid)
- **No crossover:** Can't do within-subjects comparison
- **Confounded:** Experimental = Cohort A, Control = Cohort B (can't separate effects)
- **Possible selection bias:** Were experimental participants just more motivated?
- **Condition switch killed engagement:** Everyone dropped out after being switched

### 3. Adherence Issues
- **2 of 6 participants** (Violeta, Londontown) never engaged at all
- **4 of 6 participants** dropped out when switched to second condition
- **0 of 6 participants** completed the crossover

---

## Recommendations for Reporting

### DO:
- ✅ Report this as a **pilot study** with descriptive statistics only
- ✅ Present individual participant data (transparent about small n)
- ✅ Discuss why the crossover failed (important finding!)
- ✅ Note the promising trend for gamification (despite limitations)
- ✅ Recommend a better-powered follow-up study

### DON'T:
- ❌ Run inferential statistics (t-tests, p-values) with n=3 vs n=1
- ❌ Claim the gamification effect is proven
- ❌ Ignore the cohort/condition confound
- ❌ Present this as a successful crossover design

---

## Next Steps

1. **Open in Excel/Sheets:** All CSV files can be opened for further analysis
2. **Visualize:** Create plots of individual participants (dot plots, not bar charts)
3. **Qualitative analysis:** Why did participants drop out after the switch?
4. **Redesign study:**
   - Either stick to one condition per participant (between-subjects)
   - Or improve crossover protocol to prevent dropout
   - Increase sample size dramatically (aim for n=20+ per condition)

---

## Questions?

If you need additional metrics or different breakdowns, the source code is in:
- `analysis/run_crossover_analysis.ts` (the correct analysis)
- `analysis/run_analysis.ts` (the incorrect first attempt - don't use)
