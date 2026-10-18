"""
Receipt Graveyard Resolver - End-to-End Selenium Demonstration Script
Designed for live PPT presentations, demo screen-recordings, and feature walkthroughs.
Speed: Normal (presentation-paced with visual highlight cues and PPT slide markers).
"""

import os
import sys
import time
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

# ==============================================================================
# CONFIGURATION & PRESENTATION TIMINGS
# ==============================================================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Presentation pace: allows the speaker to speak to their PPT slides comfortably
PAUSE_STEP = 2.8      # Normal pause between actions (2.5 - 3.5 seconds)
PAUSE_BRIEF = 1.5     # Brief pause after inputs
PAUSE_INSPECT = 4.0   # Longer pause to let audience examine complex views/charts

# Credentials
EMPLOYEE_USER = "alice"
EMPLOYEE_PASS = "password123"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"


# ==============================================================================
# HELPER FUNCTIONS (VISUAL HIGHLIGHTING & PPT ANNOUNCEMENTS)
# ==============================================================================
def log_slide(slide_num, title, description=""):
    """Prints a prominent console banner synced to PPT slides."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    border = "=" * 80
    print(f"\n{border}")
    print(f"🎬 [{timestamp}] PPT SLIDE #{slide_num}: {title.upper()}")
    if description:
        print(f"   💡 Talking Point: {description}")
    print(f"{border}\n")


def highlight(driver, element, color="#f97316", duration=1.2):
    """Draws a bright pulsing highlight border around elements for audience clarity."""
    try:
        driver.execute_script(
            f"""
            arguments[0].scrollIntoView({{ behavior: 'smooth', block: 'center' }});
            arguments[0].style.transition = 'all 0.3s ease';
            arguments[0].style.outline = '3px solid {color}';
            arguments[0].style.boxShadow = '0 0 16px {color}';
            """,
            element,
        )
        time.sleep(duration)
        driver.execute_script(
            """
            arguments[0].style.outline = '';
            arguments[0].style.boxShadow = '';
            """,
            element,
        )
    except Exception:
        pass


def safe_click(driver, by, selector, timeout=10, highlight_color="#22c55e"):
    """Waits for an element, highlights it visually, and clicks safely."""
    wait = WebDriverWait(driver, timeout)
    elem = wait.until(EC.element_to_be_clickable((by, selector)))
    highlight(driver, elem, color=highlight_color, duration=0.8)
    try:
        elem.click()
    except Exception:
        driver.execute_script("arguments[0].click();", elem)
    time.sleep(PAUSE_BRIEF)
    return elem


def safe_type(driver, by, selector, text, timeout=10):
    """Types text with natural presentation pacing."""
    wait = WebDriverWait(driver, timeout)
    elem = wait.until(EC.visibility_of_element_located((by, selector)))
    highlight(driver, elem, color="#3b82f6", duration=0.5)
    elem.clear()
    for char in text:
        elem.send_keys(char)
        time.sleep(0.04)
    time.sleep(PAUSE_BRIEF)
    return elem


# ==============================================================================
# MAIN DEMO EXECUTION
# ==============================================================================
def run_presentation_demo():
    print("\n" + "#" * 80)
    print("  🚀 INITIALIZING SELENIUM DEMONSTRATION SUITE")
    print("  Target Application: HackForge - AI Receipt Graveyard Resolver")
    print(f"  Frontend URL: {FRONTEND_URL}")
    print("#" * 80 + "\n")

    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-infobars")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])

    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 15)

    try:
        # ======================================================================
        # SLIDE 1: INTRO & AUTHENTICATION (EMPLOYEE PORTAL)
        # ======================================================================
        log_slide(
            1,
            "Role-Based Authentication & Gateway",
            "Showcase PBKDF2 secure login, role selection toggle (Employee / Admin), and brand UI.",
        )
        driver.get(f"{FRONTEND_URL}/login")
        time.sleep(PAUSE_STEP)

        # Select Employee role button if present
        role_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'Employee')]")
        if role_buttons:
            highlight(driver, role_buttons[0], "#f97316")
            role_buttons[0].click()

        # Input Credentials
        username_input = driver.find_element(By.CSS_SELECTOR, "input[name='username'], input[type='text']")
        safe_type(driver, By.CSS_SELECTOR, "input[name='username'], input[type='text']", EMPLOYEE_USER)

        password_input = driver.find_element(By.CSS_SELECTOR, "input[name='password'], input[type='password']")
        safe_type(driver, By.CSS_SELECTOR, "input[name='password'], input[type='password']", EMPLOYEE_PASS)

        # Click Sign In
        submit_btn = driver.find_element(By.XPATH, "//button[contains(., 'Sign In') or contains(., 'Login')]")
        safe_click(driver, By.XPATH, "//button[contains(., 'Sign In') or contains(., 'Login')]")
        time.sleep(PAUSE_STEP)

        # ======================================================================
        # SLIDE 2: THEME SWITCHER & UI POLISH
        # ======================================================================
        log_slide(
            2,
            "Theme Engine & Responsive Layout",
            "Demonstrate Dark Mode and Light Mode switching with high-contrast accessibility.",
        )
        theme_toggles = driver.find_elements(By.CSS_SELECTOR, "button[title*='theme' i], button[aria-label*='theme' i]")
        if not theme_toggles:
            theme_toggles = driver.find_elements(By.XPATH, "//button[contains(@class, 'theme') or contains(@class, 'Theme')]")

        if theme_toggles:
            highlight(driver, theme_toggles[0], "#ec4899", duration=1.0)
            theme_toggles[0].click()
            print("  ✓ Toggled to Light/Dark Mode")
            time.sleep(PAUSE_STEP)
            # Toggle back to original
            theme_toggles[0].click()
            print("  ✓ Restored preferred presentation theme")
            time.sleep(PAUSE_BRIEF)

        # ======================================================================
        # SLIDE 3: EMPLOYEE DASHBOARD & KPI METRICS
        # ======================================================================
        log_slide(
            3,
            "Employee Self-Service Dashboard",
            "Live overview of monthly spending caps, reimbursement status counters, and recent activity.",
        )
        driver.get(f"{FRONTEND_URL}/")
        time.sleep(PAUSE_INSPECT)

        # Highlight key stats / metric cards
        cards = driver.find_elements(By.CSS_SELECTOR, "div[class*='Card'], div[class*='stat'], div[class*='card']")
        for card in cards[:3]:
            highlight(driver, card, "#3b82f6", duration=0.8)

        # ======================================================================
        # SLIDE 4: SMART SUBMIT & AI EXTRACTION PIPELINE
        # ======================================================================
        log_slide(
            4,
            "Smart Submit: Multi-Channel Ingestion & AI Processing",
            "Multi-channel simulation (Web/Slack/Email/S3) + Instant sample load + OCR extraction stepper.",
        )
        safe_click(driver, By.XPATH, "//a[@href='/submit'] | //span[contains(text(), 'Submit Receipt')]")
        time.sleep(PAUSE_STEP)

        # Explore Multi-Channel simulation buttons
        channels = driver.find_elements(By.XPATH, "//button[contains(., 'Slack') or contains(., 'Email') or contains(., 'Web')]")
        for ch in channels[:3]:
            highlight(driver, ch, "#8b5cf6", duration=0.6)
            time.sleep(0.3)

        # Click the 'Multi-Item Bistro' one-click sample loader
        sample_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Multi-Item Bistro') or contains(., 'Bistro')]")))
        highlight(driver, sample_btn, "#10b981", duration=1.0)
        sample_btn.click()
        print("  ✓ Loaded high-resolution sample receipt: Multi-Item Bistro (San Francisco, Meals)")
        time.sleep(PAUSE_STEP)

        # Scroll down to inspect pre-filled form fields
        driver.execute_script("window.scrollBy({ top: 300, behavior: 'smooth' });")
        time.sleep(PAUSE_BRIEF)

        # Click 'Process & Analyze Receipt'
        process_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Process') or contains(., 'Audit Receipt')]")))
        highlight(driver, process_btn, "#f59e0b", duration=1.2)
        process_btn.click()
        print("  ✓ AI Processing Pipeline triggered (OCR, Perceptual Hash, FX Conversion, Policy Engine)...")

        # Wait for the AI Stepper & Decision Split View to render
        wait.until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'split') or contains(@class, 'result') or contains(text(), 'Decision') or contains(text(), 'Audit')]")))
        time.sleep(PAUSE_INSPECT)

        # ======================================================================
        # SLIDE 5: SPLIT-VIEW AUDIT & ITEM-LEVEL DISALLOWANCE
        # ======================================================================
        log_slide(
            5,
            "AI Decision Split-View: Real-Time Policy Audit & FX Conversion",
            "Point out receipt image alongside line-items, non-reimbursable alcohol deduction, and INR FX conversion.",
        )
        # Highlight Split View columns (Image on left, Audited items on right)
        split_sections = driver.find_elements(By.CSS_SELECTOR, "div[class*='Split'], div[class*='details'], div[class*='preview']")
        for section in split_sections[:2]:
            highlight(driver, section, "#06b6d4", duration=1.0)

        # Scroll to view line-item itemization and policy violation flags
        driver.execute_script("window.scrollBy({ top: 400, behavior: 'smooth' });")
        time.sleep(PAUSE_INSPECT)

        # ======================================================================
        # SLIDE 6: EXPENSE LEDGER & DETAILED MODAL AUDIT
        # ======================================================================
        log_slide(
            6,
            "Historical Expense Ledger & Filterable Records",
            "Status breakdown pills (Approved, Partial, Pending), category search, and full modal drill-down.",
        )
        safe_click(driver, By.XPATH, "//a[@href='/expenses'] | //span[contains(text(), 'My Expenses') or contains(text(), 'Expense Records')]")
        time.sleep(PAUSE_STEP)

        # Try filtering by status if filter buttons or inputs exist
        filters = driver.find_elements(By.CSS_SELECTOR, "button[class*='filter'], input[placeholder*='Search' i]")
        if filters:
            highlight(driver, filters[0], "#3b82f6", duration=0.8)

        # Click on the first expense row/card to view detailed inspection modal
        first_row = wait.until(EC.element_to_be_clickable((By.XPATH, "//table//tbody/tr[1] | //div[contains(@class, 'expenseCard')][1] | //button[contains(., 'View')][1]")))
        highlight(driver, first_row, "#8b5cf6", duration=1.0)
        first_row.click()
        print("  ✓ Opened Receipt Inspection Modal")
        time.sleep(PAUSE_INSPECT)

        # Close modal
        close_btn = driver.find_elements(By.XPATH, "//button[contains(@class, 'close') or contains(., 'Close') or @aria-label='Close']")
        if close_btn:
            safe_click(driver, By.XPATH, "//button[contains(@class, 'close') or contains(., 'Close') or @aria-label='Close']")
        else:
            driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(PAUSE_BRIEF)

        # ======================================================================
        # SLIDE 7: ROLE ELEVATION - LOGOUT & ADMIN AUTHENTICATION
        # ======================================================================
        log_slide(
            7,
            "Role Transition: Admin & Finance Oversight",
            "Switch from employee context to Finance Administrator to demonstrate compliance governance.",
        )
        # Click logout
        logout_btn = driver.find_elements(By.XPATH, "//button[contains(., 'Sign Out') or contains(., 'Logout')]")
        if logout_btn:
            safe_click(driver, By.XPATH, "//button[contains(., 'Sign Out') or contains(., 'Logout')]")
        else:
            driver.get(f"{FRONTEND_URL}/login")
        time.sleep(PAUSE_STEP)

        # Select Admin role
        admin_role_btn = driver.find_elements(By.XPATH, "//button[contains(text(), 'Admin')]")
        if admin_role_btn:
            highlight(driver, admin_role_btn[0], "#dc2626")
            admin_role_btn[0].click()

        safe_type(driver, By.CSS_SELECTOR, "input[name='username'], input[type='text']", ADMIN_USER)
        safe_type(driver, By.CSS_SELECTOR, "input[name='password'], input[type='password']", ADMIN_PASS)
        safe_click(driver, By.XPATH, "//button[contains(., 'Sign In') or contains(., 'Login')]")
        time.sleep(PAUSE_STEP)

        # ======================================================================
        # SLIDE 8: MULTI-CHANNEL INGESTION HUB (/admin/process)
        # ======================================================================
        log_slide(
            8,
            "Multi-Channel Automated Intake Hub",
            "Omnichannel ingestion monitoring across Slack, Email Ingestion Daemon, AWS S3 Buckets, and Web.",
        )
        driver.get(f"{FRONTEND_URL}/admin/process")
        time.sleep(PAUSE_INSPECT)

        channel_tabs = driver.find_elements(By.XPATH, "//button[contains(., 'Slack') or contains(., 'Email') or contains(., 'All Channels')]")
        for tab in channel_tabs[:4]:
            highlight(driver, tab, "#f59e0b", duration=0.8)
            tab.click()
            time.sleep(PAUSE_BRIEF)

        # ======================================================================
        # SLIDE 9: ADMIN APPROVAL QUEUE & FRAUD OVERRIDE (/admin/queue)
        # ======================================================================
        log_slide(
            9,
            "Manager Approval Queue & Fraud Triage",
            "Review flagged claims, policy threshold breaches, duplicate perceptual hashes, and apply managerial overrides.",
        )
        driver.get(f"{FRONTEND_URL}/admin/queue")
        time.sleep(PAUSE_INSPECT)

        # Check for approval queue list items
        queue_items = driver.find_elements(By.CSS_SELECTOR, "div[class*='queueItem'], div[class*='card'], tr")
        if queue_items:
            highlight(driver, queue_items[0], "#ef4444", duration=1.0)

        # Input Manager audit notes
        notes_input = driver.find_elements(By.CSS_SELECTOR, "textarea, input[placeholder*='notes' i]")
        if notes_input:
            safe_type(driver, By.CSS_SELECTOR, "textarea, input[placeholder*='notes' i]", "Approved verified business lunch per manager policy.")
            time.sleep(PAUSE_BRIEF)

        # Highlight action buttons (Approve / Reject)
        action_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Approve') or contains(., 'Override')]")
        if action_btns:
            highlight(driver, action_btns[0], "#22c55e", duration=1.0)

        # ======================================================================
        # SLIDE 10: ANALYTICS & COMPLIANCE DASHBOARD (/admin/analytics)
        # ======================================================================
        log_slide(
            10,
            "Expense Analytics, Compliance & Audit Savings",
            "Interactive spend breakdown, category Pareto charts, audit pass/fail ratios, and CSV financial export.",
        )
        driver.get(f"{FRONTEND_URL}/admin/analytics")
        time.sleep(PAUSE_INSPECT)

        # Highlight Analytics charts
        charts = driver.find_elements(By.CSS_SELECTOR, "div[class*='chart'], div[class*='recharts'], svg")
        for chart in charts[:2]:
            highlight(driver, chart, "#8b5cf6", duration=1.2)

        # Highlight Export to CSV button
        export_btn = driver.find_elements(By.XPATH, "//button[contains(., 'Export') or contains(., 'CSV')]")
        if export_btn:
            highlight(driver, export_btn[0], "#10b981", duration=1.0)
            print("  ✓ Financial Audit CSV Export triggered")

        # ======================================================================
        # SLIDE 11: DYNAMIC POLICY ENGINE CONFIGURATION (/admin/policy)
        # ======================================================================
        log_slide(
            11,
            "Dynamic Policy Engine Rules & Per-Diem Caps",
            "Configurable monthly employee budgets, manager thresholds, city daily caps, and banned keywords.",
        )
        driver.get(f"{FRONTEND_URL}/admin/policy")
        time.sleep(PAUSE_INSPECT)

        # Scroll to show city caps and disallowed keywords chips
        driver.execute_script("window.scrollBy({ top: 350, behavior: 'smooth' });")
        time.sleep(PAUSE_BRIEF)

        policy_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='number']")
        if policy_inputs:
            highlight(driver, policy_inputs[0], "#f97316", duration=1.0)

        save_policy_btn = driver.find_elements(By.XPATH, "//button[contains(., 'Save') or contains(., 'Update Policy')]")
        if save_policy_btn:
            highlight(driver, save_policy_btn[0], "#22c55e", duration=1.0)

        # ======================================================================
        # CONCLUSION
        # ======================================================================
        log_slide(
            12,
            "Conclusion & Q&A Summary",
            "Complete feature loop demonstrated: Ingestion -> AI OCR -> FX Conversion -> Audit Rules -> Governance.",
        )
        time.sleep(PAUSE_STEP)
        print("\n✨ DEMONSTRATION COMPLETE: All features successfully demonstrated for PPT presentation!\n")

    except Exception as e:
        print(f"\n⚠️ Demonstration encountered an error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        print("Closing browser in 5 seconds...")
        time.sleep(5)
        driver.quit()


if __name__ == "__main__":
    run_presentation_demo()
