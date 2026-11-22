"""4-hour delivery network for Delhi NCR (v2).
Groups the existing 12-min dark stores into 4-hr polygons with the fewest hubs, such that:
  * span   : distance between the two farthest dark stores in a polygon <= 20 km
  * radius : distance from the hub (order-weighted centroid) to any of its dark stores <= 12.5 km
"""
import sys, numpy as np, pandas as pd, folium
from scipy.spatial import ConvexHull
from sklearn.cluster import KMeans

SRC, OUT = sys.argv[1], sys.argv[2]
MAX_SPAN, MAX_RAD = 20.0, 12.5
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
lat0 = np.radians(lat.mean())
XY = np.column_stack([np.radians(lng)*R*np.cos(lat0), np.radians(lat)*R])

def span(idx):
    return D[np.ix_(idx, idx)].max() if len(idx) > 1 else 0.0
def hubdist(idx):
    hl, hg = np.average(lat[idx], weights=w[idx]), np.average(lng[idx], weights=w[idx])
    return hav(hl, hg, lat[idx], lng[idx])
def ok(idx):
    return len(idx) == 0 or (span(idx) <= MAX_SPAN and hubdist(idx).max() <= MAX_RAD)
def groups(labels):
    return {k: np.where(labels == k)[0] for k in np.unique(labels)}
def feasible(labels):
    return all(ok(i) for i in groups(labels).values())

def repair(labels, iters=400):
    labels = labels.copy()
    for _ in range(iters):
        G = groups(labels)
        bad = [k for k, i in G.items() if not ok(i)]
        if not bad:
            return labels, True
        moved = False
        for k in bad:
            idx = np.where(labels == k)[0]
            sub = D[np.ix_(idx, idx)]
            if sub.max() > MAX_SPAN:
                worst = idx[np.argmax((sub > MAX_SPAN).sum(1) + sub.max(1)/1000)]
            else:
                worst = idx[np.argmax(hubdist(idx))]
            cands = sorted((D[worst, i].mean(), j) for j, i in groups(labels).items() if j != k)
            for _, j in cands:
                if ok(np.append(np.where(labels == j)[0], worst)):
                    labels[worst] = j; moved = True; break
        if not moved:
            return labels, False
    return labels, feasible(labels)

def eliminate(labels):
    """Try to dissolve the smallest polygons by moving all their stores into neighbours."""
    labels = labels.copy()
    improved = True
    while improved:
        improved = False
        G = groups(labels)
        for k in sorted(G, key=lambda k: w[G[k]].sum()):
            trial = labels.copy(); good = True
            for s in G[k]:
                cands = sorted((D[s, i].mean(), j) for j, i in groups(trial).items() if j != k)
                placed = False
                for _, j in cands:
                    if ok(np.append(np.where(trial == j)[0], s)):
                        trial[s] = j; placed = True; break
                if not placed:
                    good = False; break
            if good:
                labels = trial; improved = True; break
    return labels

def polish(labels, rounds=5):
    """Single-store moves that reduce order-weighted hub distance while staying feasible."""
    labels = labels.copy()
    for _ in range(rounds):
        changed = False
        for s in range(len(labels)):
            k = labels[s]
            src = np.where(labels == k)[0]
            if len(src) == 1: continue
            for j in np.unique(labels):
                if j == k: continue
                dst = np.where(labels == j)[0]
                new_src, new_dst = src[src != s], np.append(dst, s)
                if not (ok(new_src) and ok(new_dst)): continue
                before = (w[src]*hubdist(src)).sum() + (w[dst]*hubdist(dst)).sum()
                after = (w[new_src]*hubdist(new_src)).sum() + (w[new_dst]*hubdist(new_dst)).sum()
                if after < before - 1e-6:
                    labels[s] = j; changed = True; break
        if not changed: break
    return labels

def wcost(labels):
    return sum((w[i]*hubdist(i)).sum() for i in groups(labels).values())

best = None
for K in range(6, 40):
    found = []
    for seed in range(200):
        km = KMeans(n_clusters=K, n_init=1, random_state=seed).fit(XY, sample_weight=w)
        lab, good = repair(km.labels_)
        if good:
            found.append(pd.factorize(eliminate(lab))[0])
    if found:
        kmin = min(len(np.unique(f)) for f in found)
        cands = [f for f in found if len(np.unique(f)) == kmin]
        cand = min(cands, key=wcost)
        print(f"K={K}: feasible, best after merging = {kmin} hubs")
        if best is None or kmin < len(np.unique(best)) or (kmin == len(np.unique(best)) and wcost(cand) < wcost(best)):
            best = cand
        if K >= 22:
            break
    else:
        print(f"K={K}: infeasible")
best_labels = polish(best)
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
    "Within rules": ["Yes" if (s <= MAX_SPAN and r <= MAX_RAD) else "NO" for s, r in zip(H.span, H.maxd)],
    "Order-wtd avg hub->store dist (km)": H.avgd.round(2),
})
detail = df.sort_values(["Polygon", "qty"], ascending=[True, False])[
    ["Polygon", "name", "lat", "lng", "qty", "dist_to_hub_km"]].rename(columns={
    "name": "WH_Name", "lat": "Latitude", "lng": "Longitude", "qty": "Orders",
    "dist_to_hub_km": "Distance to 4hr hub (km)"})
detail["Distance to 4hr hub (km)"] = detail["Distance to 4hr hub (km)"].round(2)
notes = pd.DataFrame({"Item": [
    "Rules", "Span definition", "Hub location", "Duplicates removed", "Total dark stores", "Total orders",
    "4-hr polygons", "Largest polygon span (km)", "Largest hub-to-store distance (km)"], "Value": [
    "Span (farthest two dark stores in a polygon) <= 20 km AND hub-to-any-dark-store <= 12.5 km",
    "Straight-line (haversine) distance between the two farthest dark stores in the same polygon",
    "Order-weighted centre of the polygon's dark stores (minimises delivery km)",
    "; ".join(dupes.name) or "None", len(df), int(TOT), len(H), round(H.span.max(), 2), round(H.maxd.max(), 2)]})
with pd.ExcelWriter(f"{OUT}/NCR_4hr_network_plan_v2.xlsx", engine="openpyxl") as xw:
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
    f"{len(H)} hubs · {len(df)} dark stores · max polygon span {H.span.max():.1f} km (limit 20) · max hub→store {H.maxd.max():.1f} km (limit 12.5)</div>"))
m.save(f"{OUT}/NCR_4hr_network_map_v2.html")

pd.set_option("display.width", 250, "display.max_columns", 20)
print(summary.drop(columns=["Hub Lat", "Hub Lng"]).to_string(index=False))
print("Duplicates removed:", list(dupes.name))
