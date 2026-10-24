import csv


def mean(values):
    return sum(values) / len(values)


by_year = {}
with open("changi_monthly_mean_temp.csv") as f:
    for row in csv.DictReader(f):
        year = row["month"][:4]
        if year not in by_year:
            by_year[year] = []
        by_year[year].append(float(row["mean_temp"]))

for year in ["1984", "2004", "2024"]:
    print(year, len(by_year[year]), round(mean(by_year[year]), 2))
