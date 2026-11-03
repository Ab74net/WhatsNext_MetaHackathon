"""Model roles select their configured Meta keys without making network calls."""

from app import config
from app.agent import MetaAgent, make_agent
from app.model_client import MetaModelClient


def test_model_key_fallbacks():
    assert config._model_keys({}) == ("", "", "")
    assert config._model_keys({"MODEL_API_KEY": "default"}) == ("default", "default", "default")
    assert config._model_keys({"WREN_API_KEY": "wren", "SAM_API_KEY": "sam"}) == ("wren", "sam", "wren")
    assert config._model_keys({"MODEL_API_KEY": "default", "WREN_API_KEY": "wren", "SAM_API_KEY": "sam"}) == ("default", "sam", "wren")


def test_client_routes_sam_and_wren_to_separate_keys(monkeypatch):
    monkeypatch.setattr(config, "SPARK_API_KEY", "spark-test-key")
    monkeypatch.setattr(config, "SAM_API_KEY", "sam-test-key")
    monkeypatch.setattr(config, "WREN_API_KEY", "wren-test-key")
    monkeypatch.setattr(config, "MOCK", False)
    client = MetaModelClient()
    assert client.client.api_key == "spark-test-key"
    assert client.sam_client.api_key == "sam-test-key"
    assert client.wren_client.api_key == "wren-test-key"
    agent = make_agent(client)
    assert isinstance(agent, MetaAgent)
    assert agent.client is client.wren_client


def test_single_key_reuses_one_client(monkeypatch):
    monkeypatch.setattr(config, "SPARK_API_KEY", "shared-test-key")
    monkeypatch.setattr(config, "SAM_API_KEY", "shared-test-key")
    monkeypatch.setattr(config, "WREN_API_KEY", "shared-test-key")
    client = MetaModelClient()
    assert client.client is client.sam_client is client.wren_client
