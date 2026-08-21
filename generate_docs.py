import os

asha_content = "ASHA Handbook 2022 - Guidelines for Community Health Workers\n\n"
for i in range(1, 26):
    asha_content += f"Chapter {i}: Community Health Initiatives\n"
    asha_content += f"1. ASHA workers must conduct routine visits in sector {i}.\n"
    asha_content += f"2. Maternal health tracking involves 4 visits per month for pregnant women in zone {i}.\n"
    asha_content += f"3. Newborn care requires checking temperature and weight on days 1, 3, 7, 14, 21, and 28.\n"
    asha_content += f"4. Immunization drives in block {i} must record OPV, BCG, and Pentavalent doses.\n"
    asha_content += f"5. Nutritional counseling: Encourage breastfeeding exclusively for the first 6 months.\n"
    asha_content += f"6. Iron and Folic Acid (IFA) supplementation: Provide 100 IFA tablets to pregnant women.\n"
    asha_content += f"7. Record keeping for malaria and dengue cases in register book {i}.\n"
    asha_content += f"8. Follow-up on severely malnourished children, referring them to the nearest NRC.\n"
    asha_content += f"9. Conduct monthly meetings with the Village Health Sanitation and Nutrition Committee (VHSNC).\n"
    asha_content += f"\n"

nhm_content = "National Health Mission (NHM) Guidelines 2024\n\n"
for i in range(1, 26):
    nhm_content += f"Section {i}: Rural Health Infrastructure and Policy\n"
    nhm_content += f"1. Sub-health centers in district {i} should cater to a population of 5000 in plain areas.\n"
    nhm_content += f"2. Each center must be staffed by at least one ANM and one male health worker.\n"
    nhm_content += f"3. Essential medicine kits for block {i} must be restocked quarterly.\n"
    nhm_content += f"4. Iron and Folic Acid (IFA) update {i}: Provide 180 IFA tablets to combat severe anemia.\n"
    nhm_content += f"5. Tuberculosis (TB) DOTS providers will receive an incentive of Rs. 1000 per cured patient.\n"
    nhm_content += f"6. Non-Communicable Disease (NCD) screening for hypertension and diabetes for age > 30.\n"
    nhm_content += f"7. Digital health records update {i}: Ensure all patient data is synced to the e-Sanjeevani portal.\n"
    nhm_content += f"8. Ambulance response time for emergency maternal care must be under 30 minutes.\n"
    nhm_content += f"9. Financial allocation for sanitation improvements in region {i} increased by 15%.\n"
    nhm_content += f"\n"

gen_content = "General Health and Hygiene 2024 - Public Advisory\n\n"
for i in range(1, 26):
    gen_content += f"Part {i}: Everyday Health and Wellness\n"
    gen_content += f"1. Maintain a balanced diet rich in proteins and green leafy vegetables for optimal immunity.\n"
    gen_content += f"2. Adults should consume at least 2 liters of water daily, adjusted for climate {i}.\n"
    gen_content += f"3. Diarrhea management: Start ORS immediately. Zinc supplementation: 20 mg per day for 14 days.\n"
    gen_content += f"4. Hand hygiene: Wash hands with soap for at least 20 seconds before meals.\n"
    gen_content += f"5. Sleep guidelines: Ensure 7-8 hours of continuous sleep to improve cognitive function.\n"
    gen_content += f"6. Physical activity: Engage in at least 150 minutes of moderate aerobic exercise per week.\n"
    gen_content += f"7. Limit added sugar intake to less than 10% of total daily calories (approx 50 grams).\n"
    gen_content += f"8. Avoid stagnant water in residential areas to prevent mosquito breeding in sector {i}.\n"
    gen_content += f"9. Mental health check {i}: Practice mindfulness or meditation to reduce stress levels.\n"
    gen_content += f"\n"

with open(r'E:\sangamrag\documents\ASHA_Handbook_2022.txt', 'w', encoding='utf-8') as f:
    f.write(asha_content)
with open(r'E:\sangamrag\documents\NHM_Guideline_2024.txt', 'w', encoding='utf-8') as f:
    f.write(nhm_content)
with open(r'E:\sangamrag\documents\General_Health_2024.txt', 'w', encoding='utf-8') as f:
    f.write(gen_content)

print(f"ASHA lines: {len(asha_content.splitlines())}")
print(f"NHM lines: {len(nhm_content.splitlines())}")
print(f"General lines: {len(gen_content.splitlines())}")
