import sys
import os

# Add the project root to sys.path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    print("Verifying Rahul...")
    from agents.rahul.agent import RahulAgent
    r = RahulAgent()
    print("✅ Rahul instantiated.")
except Exception as e:
    print(f"❌ Rahul failed: {e}")

try:
    print("Verifying Adit...")
    from agents.adit.agent import AditAgent
    a = AditAgent()
    print("✅ Adit instantiated.")
except Exception as e:
    print(f"❌ Adit failed: {e}")

try:
    print("Verifying Suraj...")
    from agents.suraj.agent import SurajAgent
    s = SurajAgent()
    print("✅ Suraj instantiated.")
except Exception as e:
    print(f"❌ Suraj failed: {e}")
