"""4-hour delivery network for Delhi NCR.
Groups the existing 12-min dark stores into 4-hr polygons such that the
max distance across any polygon (between any two stores in it) <= 14 km,
using the fewest polygons possible. Hub = order-weighted centre of polygon.
"""
import sys, numpy as np, pandas as pd, folium
from scipy.spatial import ConvexHull
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.spatial.distance import squareform
from sklearn.cluster import KMeans

SRC = sys.argv[1]
OUT = sys.argv[2]
MAX_SPAN = 14.0
R = 6371.0

df = pd.read_csv(SRC)
df.columns = ["name", "lat", "lng", "qty"]
dupes = df[df.duplicated(keep="first")]
df = df.drop_duplicates().reset_index(drop=True)

lat, lng, w = df.lat.values, df.lng.values, df.qty.values.astype(float)

def hav(a1, o1, a2, o2):
    a1, o1, a2, o2 = map(np.radians, (a1, o1, a2, o2))
    h = np.sin((a2-a1)/2)**2 + np.cos(a1)*np.cos(a2)*np.sin((o2-o1)/2)**2
    return 2*R*np.arcsin(np.sqrt(h))

D = hav(lat[:, None], lng[:, None], lat[None, :], lng[None, :])
# planar km coords for clustering
lat0 = np.radians(lat.mean())
XY = np.column_stack([np.radians(lng)*R*np.cos(lat0), np.radians(lat)*R])

def span(idx):
    return D[np.ix_(idx, idx)].max() if len(idx) > 1 else 0.0

def feasible(labels):
    return all(span(np.where(labels == k)[0]) <= MAX_SPAN for k in np.unique(labels))

def repair(labels, iters=300):
    """Move stores out of polygons that are too wide into a neighbour polygon that can absorb them."""
    labels = labels.copy()
    for _ in range(iters):
        bad = [k for k in np.unique(labels) if span(np.where(labels == k)[0]) > MAX_SPAN]
        if not bad:
            return labels, True
        moved = False
        for k in bad:
            idx = np.where(labels == k)[0]
            sub = D[np.ix_(idx, idx)]
            # store causing the most violations
            worst = idx[np.argmax((sub > MAX_SPAN).sum(1))]
            best, bestcost = None, 1e9
            for j in np.unique(labels):
                if j == k: continue
                jdx = np.where(labels == j)[0]
                if D[worst, jdx].max() <= MAX_SPAN:
                    c = D[worst, jdx].mean()
                    if c < bestcost: best, bestcost = j, c
            if best is not None:
                labels[worst] = best; moved = True
        if not moved:
            return labels, False
    return labels, feasible(labels)

# Upper bound: complete-linkage clustering cut at 14 km guarantees span <= 14
Z = linkage(squareform(D, checks=False), method="complete")
base = fcluster(Z, MAX_SPAN, criterion="distance") - 1
k_upper = len(np.unique(base))
print("Complete-linkage polygons:", k_upper)

def wcost(labels):
    c = 0
    for k in np.unique(labels):
        i = np.where(labels == k)[0]
        cx = np.average(XY[i], axis=0, weights=w[i])
        c += (w[i] * np.linalg.norm(XY[i]-cx, axis=1)).sum()
    return c

best_labels, best_k = base, k_upper
rng = np.random.RandomState(7)
for K in range(max(2, k_upper-2), k_upper+1):
    found = None
    for seed in range(300):
        km = KMeans(n_clusters=K, n_init=1, random_state=seed).fit(XY, sample_weight=w)
        lab, ok = repair(km.labels_)
        lab = pd.factorize(lab)[0]
        if ok and len(np.unique(lab)) <= K:
            if found is None or wcost(lab) < wcost(found):
                found = lab
    print(K, "feasible" if found is not None else "infeasible")
    if found is not None and K < best_k or (found is not None and K == best_k and wcost(found) < wcost(best_labels)):
        best_labels, best_k = found, len(np.unique(found))
        break

labels = pd.factorize(best_labels)[0]
assert feasible(labels)
# number polygons west->east by hub longitude, then build outputs
df["poly"] = labels
hubs = []
for k in range(labels.max()+1):
    i = np.where(labels == k)[0]
    hl, hg = np.average(lat[i], weights=w[i]), np.average(lng[i], weights=w[i])
    d = hav(hl, hg, lat[i], lng[i])
    near = i[np.argmin(d)]
    hubs.append(dict(k=k, lat=hl, lng=hg, n=len(i), vol=w[i].sum(), span=span(i),
                     avgd=np.average(d, weights=w[i]), maxd=d.max(),
                     near=df.name[near], neard=hav(hl, hg, lat[near], lng[near])))
H = pd.DataFrame(hubs).sort_values("vol", ascending=False).reset_index(drop=True)
remap = {old: f"P{n+1:02d}" for n, old in enumerate(H.k)}
H["Polygon"] = H.k.map(remap)
df["Polygon"] = df.poly.map(remap)

def region(names):
    pre = pd.Series([s.split("-")[0].strip().split("_")[0].upper() for s in names]).value_counts()
    return "/".join(pre.index[:2])
H["Region"] = [region(df.name[df.poly == k]) for k in H.k]
for c, n in [("lat", "hub_lat"), ("lng", "hub_lng")]:
    df[n] = df.poly.map(dict(zip(H.k, H[c])))
df["dist_to_hub_km"] = hav(df.hub_lat, df.hub_lng, df.lat, df.lng)
TOT = w.sum()

# ---------- Excel ----------
summary = pd.DataFrame({
    "Polygon": H.Polygon, "Region": H.Region,
    "Hub Lat": H.lat.round(6), "Hub Lng": H.lng.round(6),
    "Nearest existing dark store (co-location option)": H.near,
    "Dist hub->that store (km)": H.neard.round(2),
    "Dark stores in polygon": H.n, "Daily orders (12-min base)": H.vol.astype(int),
    "% of NCR orders": (100*H.vol/TOT).round(1),
    "Max span across polygon (km)": H.span.round(2),
    "Max hub->store dist (km)": H.maxd.round(2),
    "Order-wtd avg hub->store dist (km)": H.avgd.round(2),
})
detail = df.sort_values(["Polygon", "qty"], ascending=[True, False])[
    ["Polygon", "name", "lat", "lng", "qty", "dist_to_hub_km"]].rename(columns={
    "name": "WH_Name", "lat": "Latitude", "lng": "Longitude", "qty": "Orders",
    "dist_to_hub_km": "Distance to 4hr hub (km)"})
detail["Distance to 4hr hub (km)"] = detail["Distance to 4hr hub (km)"].round(2)
notes = pd.DataFrame({"Item": [
    "Rule", "Span definition", "Hub location", "Duplicates removed", "Total dark stores", "Total orders",
    "4-hr polygons", "Largest polygon span (km)"], "Value": [
    "Max distance across any 4-hr polygon <= 14 km",
    "Straight-line (haversine) distance between the two farthest dark stores in the same polygon",
    "Order-weighted centre of the polygon's dark stores (minimises delivery km)",
    "; ".join(dupes.name) or "None", len(df), int(TOT), len(H), round(H.span.max(), 2)]})
with pd.ExcelWriter(f"{OUT}/NCR_4hr_network_plan.xlsx", engine="openpyxl") as xw:
    summary.to_excel(xw, sheet_name="4hr Hub Summary", index=False)
    detail.to_excel(xw, sheet_name="Dark Store Mapping", index=False)
    notes.to_excel(xw, sheet_name="Assumptions", index=False)
    for ws in xw.book.worksheets:
        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].width = min(48, max(len(str(c.value or "")) for c in col) + 2)
        ws.freeze_panes = "A2"

# ---------- Map ----------
pal = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#9a6324",
       "#469990", "#800000", "#808000", "#000075", "#bfef45", "#ff7f50", "#2f4f4f", "#dc143c",
       "#8b4513", "#6a5acd", "#008080", "#b8860b"]
m = folium.Map(location=[lat.mean(), lng.mean()], zoom_start=10, tiles="cartodbpositron")
qmin, qmax = w.min(), w.max()
for n, h in H.iterrows():
    col = pal[n % len(pal)]
    sub = df[df.poly == h.k]
    g = folium.FeatureGroup(name=f"{h.Polygon} · {h.Region} · {int(h.vol):,} orders")
    pts = sub[["lat", "lng"]].values
    if len(pts) >= 3:
        try:
            hull = pts[ConvexHull(pts[:, ::-1]).vertices]
            folium.Polygon(hull.tolist(), color=col, weight=2, fill=True, fill_opacity=0.15,
                           tooltip=f"{h.Polygon}: span {h.span:.1f} km").add_to(g)
        except Exception:
            pass
    elif len(pts) == 2:
        folium.PolyLine(pts.tolist(), color=col, weight=3).add_to(g)
    for _, r in sub.iterrows():
        folium.CircleMarker([r.lat, r.lng], radius=4 + 10*(r.qty-qmin)/(qmax-qmin), color=col,
                            fill=True, fill_opacity=0.8, weight=1,
                            tooltip=f"<b>{r['name']}</b><br>{int(r.qty):,} orders<br>{h.Polygon} · {r.dist_to_hub_km:.1f} km to hub").add_to(g)
    folium.Marker([h.lat, h.lng], icon=folium.Icon(color="black", icon="warehouse", prefix="fa"),
                  tooltip=(f"<b>{h.Polygon} 4-hr hub</b><br>{h.n} dark stores · {int(h.vol):,} orders<br>"
                           f"Span {h.span:.1f} km · max hub→store {h.maxd:.1f} km<br>"
                           f"Nearest store: {h.near} ({h.neard:.1f} km)")).add_to(g)
    g.add_to(m)
folium.LayerControl(collapsed=False).add_to(m)
m.get_root().html.add_child(folium.Element(
    f"<div style='position:fixed;top:10px;left:50px;z-index:9999;background:white;padding:8px 12px;"
    f"border-radius:6px;box-shadow:0 1px 4px #0003;font:13px sans-serif'><b>Delhi NCR 4-hr network</b><br>"
    f"{len(H)} hubs · {len(df)} dark stores · max polygon span {H.span.max():.1f} km (limit 14)</div>"))
m.save(f"{OUT}/NCR_4hr_network_map.html")

pd.set_option("display.width", 250, "display.max_columns", 20)
print(summary.drop(columns=["Hub Lat", "Hub Lng"]).to_string(index=False))
print("Duplicates removed:", list(dupes.name))
