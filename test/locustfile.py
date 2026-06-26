"""
FlavorTales Tourist Stress Test
Target: https://flavortales.site
Goal: Find server breaking point by continuously ramping up concurrent users

Flow per user:
  1. POST /api/tourist/sessions        → create anonymous session
  2. GET  /api/poi                     → load POI list (map)
  3. GET  /api/audio/poi/{poiId}       → load audio for random POI
  4. POST /api/poi/{poiId}/like        → like a random POI
  5. DELETE /api/tourist/sessions/{id} → end session (on_stop)

Usage:
  python -m locust -f locustfile.py --host=https://flavortales.site
  Then open http://localhost:8089
"""

import random
from locust import HttpUser, task, between, events


class TouristUser(HttpUser):
    """Simulates an anonymous tourist browsing the FlavorTales map."""

    wait_time = between(1, 3)

    session_id: str | None = None
    poi_ids: list[int] = []

    # ------------------------------------------------------------------ #
    # Lifecycle                                                            #
    # ------------------------------------------------------------------ #

    def on_start(self):
        """Called once when a simulated user starts. Creates session & fetches POI list."""
        # 1. Create anonymous session
        with self.client.post(
            "/api/tourist/sessions",
            json={},
            catch_response=True,
            name="[setup] POST /api/tourist/sessions",
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                # Try common response shapes
                data = body.get("data") or body
                self.session_id = (
                    data.get("sessionId")
                    or data.get("session_id")
                    or data.get("id")
                )
                if not self.session_id:
                    resp.failure(f"sessionId not found in response: {body}")
            else:
                resp.failure(f"Failed to create session: {resp.status_code}")

        # 2. Fetch POI list to pick real IDs later
        with self.client.get(
            "/api/poi",
            catch_response=True,
            name="[setup] GET /api/poi",
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                data = body.get("data") or body
                pois = data if isinstance(data, list) else data.get("content", [])
                self.poi_ids = [p.get("id") or p.get("poiId") for p in pois if p]
                self.poi_ids = [pid for pid in self.poi_ids if pid]
                if not self.poi_ids:
                    # Fallback: use dummy ID so other tasks don't crash
                    self.poi_ids = [1]
            else:
                resp.failure(f"Failed to fetch POIs: {resp.status_code}")
                self.poi_ids = [1]

    def on_stop(self):
        """Called when a simulated user stops. Cleans up session."""
        if self.session_id:
            self.client.delete(
                f"/api/tourist/sessions/{self.session_id}",
                name="[teardown] DELETE /api/tourist/sessions/{id}",
            )

    # ------------------------------------------------------------------ #
    # Tasks (weighted: higher number = more frequent)                     #
    # ------------------------------------------------------------------ #

    @task(5)
    def browse_poi_list(self):
        """Tourist refreshes/pans the map — most frequent action."""
        self.client.get("/api/poi", name="GET /api/poi")

    @task(3)
    def play_audio(self):
        """Tourist clicks a POI and listens to audio narration."""
        poi_id = random.choice(self.poi_ids)
        self.client.get(
            f"/api/audio/poi/{poi_id}",
            name="GET /api/audio/poi/{poiId}",
        )

    @task(2)
    def like_poi(self):
        """Tourist likes a POI."""
        if not self.session_id:
            return
        poi_id = random.choice(self.poi_ids)
        self.client.post(
            f"/api/poi/{poi_id}/like",
            headers={"X-Session-Id": self.session_id},
            name="POST /api/poi/{poiId}/like",
        )

    @task(1)
    def validate_session(self):
        """Tourist app validates existing session (on page load)."""
        if not self.session_id:
            return
        self.client.get(
            f"/api/tourist/sessions/{self.session_id}",
            name="GET /api/tourist/sessions/{sessionId}",
        )


# ------------------------------------------------------------------ #
# Stress test helpers — print stats at key milestones                 #
# ------------------------------------------------------------------ #

BREAKING_POINT_ERROR_RATE = 5.0   # % failures threshold
BREAKING_POINT_P95_MS = 5000      # ms P95 response time threshold


@events.request.add_listener
def on_request(response_time, response_length, exception, **kwargs):
    pass  # individual request hook — extend if you need custom logging


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "=" * 60)
    print("  FlavorTales Tourist Stress Test STARTED")
    print(f"  Target host : {environment.host}")
    print(f"  Breaking point thresholds:")
    print(f"    Error rate  > {BREAKING_POINT_ERROR_RATE}%")
    print(f"    P95 latency > {BREAKING_POINT_P95_MS} ms")
    print("=" * 60 + "\n")
