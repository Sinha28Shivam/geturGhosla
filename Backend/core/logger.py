import logging
from opencensus.ext.azure.log_exporter import AzureLogHandler
from core.config import settings

def setup_azure_logging():
    logger = logging.getLogger("room_discovery")
    logger.setLevel(logging.INFO)

    conn_str = settings.APPLICATIONINSIGHTS_CONNECTION_STRING
    if conn_str:
        try:
            azure_handler = AzureLogHandler(connection_string=conn_str)
            logger.addHandler(azure_handler)
            logger.info("Azure Application Insights logging handler attached successfully.")
        except Exception as e:
            print(f"Failed to attach Azure Log Handler: {e}")
    else:
        print("Application Insights Connection String not configured. Falling back to console logging.")

    return logger

logger = setup_azure_logging()
