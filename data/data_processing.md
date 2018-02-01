# California PCT elevation profile data processing
Using California GPX data from [HalfMile PCT](https://www.pctmap.net/gps/).

1. Using **OGR2OGR**, convert all `.gpx` files to `.shp` via [`gpx-to-shp.sh`](https://github.com/clhenrick/shell_scripts/blob/master/gpx-to-shp.sh)

2. Using **Mapshaper**, merge all `*tracks_track-points_4326.shp` files into a single CSV output
  - keep only necessary fields
  - filter data to only grab points for primary route on PCT, not alternates or side routes (track_fid == 0)
  - filter data to only grab a fraction of all points
  - rename column `track_id`
  - add columns for `fid`, `lat`, `lon`
  - remove leftover columns

  ```bash
  mapshaper -i \
    CA_Sec_A_tracks_track-points_4326.shp \
    CA_Sec_B_tracks_track-points_4326.shp \
    CA_Sec_C_tracks_track-points_4326.shp \
    CA_Sec_D_tracks_track-points_4326.shp \
    CA_Sec_E_tracks_track-points_4326.shp \
    CA_Sec_F_tracks_track-points_4326.shp \
    CA_Sec_G_tracks_track-points_4326.shp \
    CA_Sec_H_tracks_track-points_4326.shp \
    CA_Sec_I_tracks_track-points_4326.shp \
    CA_Sec_J_tracks_track-points_4326.shp \
    CA_Sec_K_tracks_track-points_4326.shp \
    CA_Sec_L_tracks_track-points_4326.shp \
    CA_Sec_M_tracks_track-points_4326.shp \
    CA_Sec_N_tracks_track-points_4326.shp \
    CA_Sec_O_tracks_track-points_4326.shp \
    CA_Sec_P_tracks_track-points_4326.shp \
    CA_Sec_Q_tracks_track-points_4326.shp \
    CA_Sec_R_tracks_track-points_4326.shp \
    combine-files \
    -merge-layers \
    -filter-fields \
    track_fid,track_se_1,ele \
    -filter \
    '(track_fid == 0) && (track_se_1 % 15 == 0)' \
    -each \
    'fid=this.id, track_id=track_se_1, lon=this.x, lat=this.y, delete track_se_1, delete track_fid' \
    -o \
    format=csv \
    ca_merged.csv
  ```

3. Using **PostGIS/PostgreSQL** compute distance from previous point to next point

  ```sql
  UPDATE ca_merged
  SET dist = (
    SELECT
    ST_Distance(the_geom::geography, lag(the_geom::geography, 1) OVER (ORDER by fid ASC))
    FROM ca_merged t2
    ORDER BY ca_merged.the_geom::geography <-> t2.the_geom::geography
    LIMIT 1
  );
  ```

4. Using **PostGIS/PostgreSQL** compute cumulative distance

  ```sql
  UPDATE ca_merged
  SET dist_cum =
   (
    SELECT
    sum(dist, lag(dist, 1) OVER (ORDER by fid ASC))
    FROM ca_merged t2
  );
  ```

5. Export as CSV from PostgreSQL

  ```sql
  SELECT fid, ele, dist_cum, lat, lon
  FROM ca_merged
  ORDER BY fid;
  ```
